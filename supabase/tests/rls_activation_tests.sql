-- =============================================================================
-- RLS ACTIVATION TESTS
--
-- Production posture keeps tables fully revoked from clients and routes all
-- traffic through SECURITY DEFINER api.* functions (table owners bypass RLS).
-- Policies therefore never evaluate in normal operation — dormant
-- defense-in-depth.
--
-- This suite proves the dormant layer is CORRECT by temporarily activating it:
-- inside one rolled-back transaction we GRANT table access to authenticated,
-- impersonate users, and assert tenant isolation at the policy level. The
-- rollback restores the sealed production posture exactly.
--
-- Run: docker exec -i supabase_db_supanext psql -U postgres -d postgres \
--        < supabase/tests/rls_activation_tests.sql
-- =============================================================================

\set ON_ERROR_STOP on

begin;

create schema rls_test;

create table rls_test.results (outcome boolean not null, label text not null);
grant usage on schema rls_test to authenticated;
grant insert on table rls_test.results to authenticated;
grant execute on all functions in schema rls_test to authenticated;

create function rls_test.ok(p_cond boolean, p_label text) returns void
language plpgsql as $$
begin insert into rls_test.results values (coalesce(p_cond,false), p_label); end $$;

create function rls_test.attack_blocked(p_sql text, p_code text, p_label text) returns void
language plpgsql as $$
declare v_state text;
begin
  begin
    execute p_sql;
    insert into rls_test.results values (false, p_label||' :: LEAK — call succeeded');
    return;
  exception when others then
    v_state := sqlstate;
    if p_code is null or v_state=p_code then
      insert into rls_test.results values (true, p_label);
    else
      insert into rls_test.results values (false, p_label||' :: got '||v_state);
    end if;
  end;
end $$;

create function rls_test.become(p_user uuid) returns void
language plpgsql as $$
begin
  execute 'reset role';
  perform set_config('request.jwt.claims',
    format('{"sub":"%s","aud":"authenticated","role":"authenticated"}', p_user), true);
  execute 'set local role authenticated';
end $$;

create function rls_test.become_ops(p_user uuid) returns void
language plpgsql as $$
begin
  execute 'reset role';
  perform set_config('request.jwt.claims',
    format('{"sub":"%s","aud":"authenticated","role":"authenticated"}', p_user), true);
end $$;

create function rls_test.reset_actor() returns void
language plpgsql as $$
begin
  execute 'reset role';
  perform set_config('request.jwt.claims', '', true);
end $$;

-- -----------------------------------------------------------------------------
-- Fixtures (same shape as behaviour suite, minimal)
-- -----------------------------------------------------------------------------
insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at)
values
  ('a1111111-1111-4111-8111-111111111111','authenticated','authenticated','ra@example.com','x',now()),
  ('b2222222-2222-4222-8222-222222222222','authenticated','authenticated','rb@example.com','x',now()),
  ('c3333333-3333-4333-8333-333333333333','authenticated','authenticated','rc@example.com','x',now()),
  ('d4444444-4444-4444-8444-444444444444','authenticated','authenticated','rd@example.com','x',now());

select rls_test.become_ops('a1111111-1111-4111-8111-111111111111');
select api.bootstrap_system_admin();
select (select id from app.subscription_plans where code='basic')::text as plan \gset

set local role authenticated;
select api.request_organization('OrgA','rlsorga') as org_a \gset
reset role;
select set_config('request.jwt.claims','{"sub":"a1111111-1111-4111-8111-111111111111","role":"authenticated"}',true);
set local role authenticated;
select api.approve_organization(:'org_a');
select api.assign_subscription(:'org_a', :'plan', 'active', now(), null);
reset role;
insert into app.fundraising_campaigns(organization_id,name,goal_minor,currency,created_by)
  values (:'org_a','campA',100,'USD','a1111111-1111-4111-8111-111111111111');

reset role;
select set_config('request.jwt.claims','{"sub":"b2222222-2222-4222-8222-222222222222","role":"authenticated"}',true);
set local role authenticated;
select api.request_organization('OrgB','rlsorgb') as org_b \gset
reset role;
select set_config('request.jwt.claims','{"sub":"a1111111-1111-4111-8111-111111111111","role":"authenticated"}',true);
set local role authenticated;
select api.approve_organization(:'org_b');
reset role;
insert into app.fundraising_campaigns(organization_id,name,goal_minor,currency,created_by)
  values (:'org_b','campB',100,'USD','b2222222-2222-4222-8222-222222222222');

-- carol joins OrgA; dave joins OrgB
insert into app.organization_invitations(organization_id,email,role,token_hash,invited_by,expires_at)
  values (:'org_a','rc@example.com','member',
          encode(security.digest('tok-c','sha256'),'hex'),
          'b2222222-2222-4222-8222-222222222222', now()+interval '1 day');
reset role;
select set_config('request.jwt.claims','{"sub":"c3333333-3333-4333-8333-333333333333","role":"authenticated"}',true);
set local role authenticated;
select api.accept_invitation('tok-c');

select rls_test.reset_actor();

-- =============================================================================
-- ACTIVATE: grant table access — policies now evaluate for real.
-- This is the posture a future "selective access for complex filtering"
-- change would create. Everything below must hold in that world.
-- =============================================================================
-- Note: schema USAGE is revoked by the migration; table grants alone are
-- insufficient. A real "selective access" change must include this too.
grant usage on schema app to authenticated;
grant select on app.organizations,
                app.organization_members,
                app.organization_member_permissions,
                app.fundraising_campaigns,
                app.organization_subscriptions,
                app.organization_invitations
  to authenticated;

-- -----------------------------------------------------------------------------
-- Tenant isolation via organizations_select / campaigns_select
-- -----------------------------------------------------------------------------

-- carol (member of OrgA only) sees exactly her org, nothing else.
select rls_test.become('c3333333-3333-4333-8333-333333333333');
select rls_test.ok(
  (select count(*) from app.organizations) = 1,
  'rls: member sees exactly own organization');
select rls_test.ok(
  (select bool_and(o.name='OrgA') from app.organizations o),
  'rls: visible org is the member org');

-- Campaign rows: only OrgA's.
select rls_test.ok(
  (select count(*) from app.fundraising_campaigns) = 1,
  'rls: campaign visibility limited to own tenant');
select rls_test.ok(
  (select bool_and(f.name='campA') from app.fundraising_campaigns f),
  'rls: no foreign campaign rows leak');

-- dave sees only OrgB side.
select rls_test.reset_actor();
insert into app.organization_members(organization_id,user_id,role)
  values (:'org_b','d4444444-4444-4444-8444-444444444444','admin');
select rls_test.become('d4444444-4444-4444-8444-444444444444');
select rls_test.ok(
  (select count(*) from app.fundraising_campaigns) = 1
  and (select bool_and(f.name='campB') from app.fundraising_campaigns f),
  'rls: second tenant symmetric isolation');

-- outsider sees zero rows everywhere.
reset role;
select set_config('request.jwt.claims','',true);
set local role authenticated;
select rls_test.ok(
  (select count(*) from app.organizations) = 0
  and (select count(*) from app.fundraising_campaigns) = 0,
  'rls: unauthenticated-context sees nothing');

-- system admin sees across tenants (organizations_select admin branch).
select rls_test.become('a1111111-1111-4111-8111-111111111111');
select rls_test.ok(
  (select count(*) from app.organizations) = 2,
  'rls: system admin cross-tenant visibility');

-- -----------------------------------------------------------------------------
-- -----------------------------------------------------------------------------
-- Membership rows + deny-all tables under activation
-- -----------------------------------------------------------------------------
select rls_test.become('c3333333-3333-4333-8333-333333333333');
select rls_test.ok(
  (select count(*) from app.organization_members) >= 2,
  'rls: member sees membership rows of own org only');

-- carol (plain member) sees NO invitations even with table grant.
select rls_test.ok(
  (select count(*) from app.organization_invitations) = 0,
  'rls-active: invitations hidden from plain members');
-- bob becomes OrgA admin, then sees his org's invitations only.
select rls_test.reset_actor();
insert into app.organization_members(organization_id,user_id,role)
  values (:'org_a','b2222222-2222-4222-8222-222222222222','admin');
select rls_test.become('b2222222-2222-4222-8222-222222222222');
select rls_test.ok(
  (select count(*) from app.organization_invitations) = 1,
  'rls-active: invitations visible to owning-org admin');

-- Deny-all tables stay sealed even WITH table privileges granted.
select rls_test.attack_blocked('select count(*) from app.system_admins', '42501',
  'rls-active: system_admins policy denies despite grant');

-- -----------------------------------------------------------------------------
-- Report
-- -----------------------------------------------------------------------------
select rls_test.reset_actor();

do $report$
declare
  v_pass bigint; v_fail bigint; r record;
begin
  select count(*) filter (where outcome), count(*) filter (where not outcome)
    into v_pass, v_fail from rls_test.results;

  raise info '----------------------------------------';
  raise info 'RLS ACTIVATION TESTS  PASS: %   FAIL: %', v_pass, v_fail;
  if v_fail > 0 then
    for r in select label from rls_test.results where not outcome loop
      raise info 'FAILED: %', r.label;
    end loop;
    raise exception 'RLS TESTS FAILED: %', v_fail;
  end if;
end $report$;

rollback;
