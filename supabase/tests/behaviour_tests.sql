-- =============================================================================
-- Behaviour test suite — schema "tests"
--
-- Verifies what each user TYPE should expect from api.* / security.* given a
-- seeded state: system admin, org admin, org member (with/without explicit
-- permissions), pending-org admin, suspended-org admin, cross-org admin,
-- outsider, unauthenticated caller.
--
-- Run AFTER `supabase db reset`, as the postgres role:
--   psql 'postgresql://postgres:postgres@localhost:54322/postgres' \
--        -f supabase/tests/behaviour_tests.sql
--
-- Whole suite runs in ONE transaction and rolls back — zero residue,
-- repeatable. Non-zero exit code when any assertion fails.
--
-- Impersonation model:
--   tests.become(user)      -> SET ROLE authenticated + JWT claims (end-user view)
--   tests.become_ops(user)  -> stays postgres, JWT claims set (ops/bootstrap path)
--   tests.reset_actor()     -> back to plain postgres, claims cleared
-- =============================================================================

\set ON_ERROR_STOP on

begin;

create schema tests;

create temp table _uid (who text primary key, id uuid not null);
insert into _uid values
  ('alice', '11111111-1111-4111-8111-111111111111'),
  ('bob',   '22222222-2222-4222-8222-222222222222'),
  ('carol', '33333333-3333-4333-8333-333333333333'),
  ('dave',  '44444444-4444-4444-8444-444444444444'),
  ('erin',  '55555555-5555-4555-8555-555555555555'),
  ('frank', '66666666-6666-4666-8666-666666666666'),
  ('grace', '77777777-7777-4777-8777-777777777777'),
  ('heidi', '88888888-8888-4888-8888-888888888888'),
  ('ivy',   '99999999-9999-4999-8999-999999999999');

create temp table _ctx (key text primary key, val text not null);
grant select, insert on _ctx to authenticated;
grant select on _uid to authenticated;


create table tests.results (
  outcome boolean not null,
  label   text not null
);

grant usage on schema tests to authenticated;
grant insert on table tests.results to authenticated;
grant execute on all functions in schema tests to authenticated;

-- -----------------------------------------------------------------------------
-- Harness
-- -----------------------------------------------------------------------------

create function tests.ok(p_cond boolean, p_label text)
returns void
language plpgsql
as $$
begin
  insert into tests.results values (coalesce(p_cond, false), p_label);
end;
$$;

create function tests.run_sql(p_sql text, p_label text)
returns void
language plpgsql
as $$
begin
  execute p_sql;
  insert into tests.results values (true, p_label);
exception when others then
  insert into tests.results values (false,
    p_label || ' :: unexpected ' || sqlstate || ': ' || sqlerrm);
end;
$$;

create function tests.throws(p_sql text, p_code text, p_label text)
returns void
language plpgsql
as $$
declare
  v_state text;
begin
  begin
    execute p_sql;
    insert into tests.results values (false,
      p_label || ' :: expected exception ' || coalesce(p_code, 'ANY') || ', call succeeded');
    return;
  exception when others then
    v_state := sqlstate;
    if p_code is null or v_state = p_code then
      insert into tests.results values (true, p_label);
    else
      insert into tests.results values (false,
        p_label || ' :: expected ' || p_code || ', got ' || v_state || ': ' || sqlerrm);
    end if;
  end;
end;
$$;

-- Evaluate SQL under the CURRENT impersonation, return scalar as text.
create function tests.scalar(p_sql text)
returns text
language plpgsql
as $$
declare v text;
begin
  execute p_sql into v;
  return v;
end;
$$;

-- Lookup fixture ids from inside dynamically-executed SQL.
create function tests.ctx(p_key text)
returns text
language sql
stable
as $$
  select val from _ctx where key = p_key;
$$;

-- Impersonate an end user (authenticated role + JWT claims).
create function tests.become(p_user uuid)
returns void
language plpgsql
as $$
begin
  execute 'reset role';
  perform set_config('request.jwt.claims',
    format('{"sub":"%s","aud":"authenticated","role":"authenticated"}', p_user), true);
  execute 'set local role authenticated';
end;
$$;

-- Ops context: postgres privileges while auth.uid() resolves to p_user.
create function tests.become_ops(p_user uuid)
returns void
language plpgsql
as $$
begin
  execute 'reset role';
  perform set_config('request.jwt.claims',
    format('{"sub":"%s","aud":"authenticated","role":"authenticated"}', p_user), true);
end;
$$;

-- Anonymous end user: authenticated role, no JWT claims.
create function tests.become_anon()
returns void
language plpgsql
as $$
begin
  execute 'reset role';
  perform set_config('request.jwt.claims', '', true);
  execute 'set local role authenticated';
end;
$$;

create function tests.reset_actor()
returns void
language plpgsql
as $$
begin
  execute 'reset role';
  perform set_config('request.jwt.claims', '', true);
end;
$$;

-- -----------------------------------------------------------------------------
-- Seed: users. Auth trigger auto-creates matching app.profiles rows.
-- -----------------------------------------------------------------------------
insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data)
values
  ('11111111-1111-4111-8111-111111111111', 'authenticated', 'authenticated', 'alice@example.com', 'x', now(), '{"full_name":"Alice"}'),
  ('22222222-2222-4222-8222-222222222222', 'authenticated', 'authenticated', 'bob@example.com',   'x', now(), '{"full_name":"Bob"}'),
  ('33333333-3333-4333-8333-333333333333', 'authenticated', 'authenticated', 'carol@example.com', 'x', now(), '{"full_name":"Carol"}'),
  ('44444444-4444-4444-8444-444444444444', 'authenticated', 'authenticated', 'dave@example.com',  'x', now(), '{"full_name":"Dave"}'),
  ('55555555-5555-4555-8555-555555555555', 'authenticated', 'authenticated', 'erin@example.com',  'x', now(), '{"full_name":"Erin"}'),
  ('66666666-6666-4666-8666-666666666666', 'authenticated', 'authenticated', 'frank@example.com', 'x', now(), '{"full_name":"Frank"}'),
  ('77777777-7777-4777-8777-777777777777', 'authenticated', 'authenticated', 'grace@example.com', 'x', now(), '{"full_name":"Grace"}'),
  ('88888888-8888-4888-8888-888888888888', 'authenticated', 'authenticated', 'heidi@example.com', 'x', now(), '{"full_name":"Heidi"}'),
  ('99999999-9999-4999-8999-999999999999', 'authenticated', 'authenticated', 'ivy@example.com',   'x', now(), '{"full_name":"Ivy"}');

-- =============================================================================
-- ACT 0 — unauthenticated caller expectations
-- =============================================================================
select tests.become_anon();

select tests.throws('select api.get_session_context()', '28000',
  'anon: get_session_context rejected');
select tests.ok(
  (select tests.scalar('select security.can_perform(''fundraising.view'')') = 'false'),
  'anon: can_perform returns false without crashing');
select tests.throws('select count(*) from app.profiles', '42501',
  'anon: direct table access denied (privileges revoked)');

-- =============================================================================
-- ACT 1 — system admin bootstrap (ops-only surface)
-- =============================================================================
select tests.become((select id from _uid where who='alice'));
select tests.throws('select api.bootstrap_system_admin()', '42501',
  'sysadmin: bootstrap NOT callable by authenticated');

select tests.become_ops((select id from _uid where who='alice'));
select tests.run_sql('select api.bootstrap_system_admin()',
  'ops: first bootstrap (alice)');
select tests.become_ops((select id from _uid where who='bob'));
select tests.throws('select api.bootstrap_system_admin()', '55006',
  'ops: second bootstrap refuses — admin already exists');

select tests.become((select id from _uid where who='alice'));
select tests.ok(
  (select tests.scalar('select security.is_system_admin()') = 'true'),
  'sysadmin: alice recognised as system admin');

-- =============================================================================
-- ACT 1.5 — profile self-management
-- =============================================================================
select tests.become((select id from _uid where who='bob'));
select tests.run_sql(
  $t$select api.update_my_profile('Bobby Tables','https://cdn.example/bob.png')$t$,
  'profile: update display name and avatar');
select tests.ok(
  (select tests.scalar(
    $t$select (api.update_my_profile(null,null))->>'display_name'$t$) = 'Bobby Tables'),
  'profile: blank/null args preserve existing values');
select tests.throws(
  $t$select api.update_my_profile(repeat('x',120),null)$t$, '22023',
  'profile: oversized display name rejected');
select tests.throws(
  $t$select api.update_my_profile('ok','ftp://bad')$t$, '22023',
  'profile: non-http avatar URL rejected');
select tests.reset_actor();
select tests.ok(
  exists (
    select 1 from app.profiles pr
    join auth.users u on u.id=pr.id
    where lower(u.email)='bob@example.com'
      and pr.display_name='Bobby Tables'
      and pr.avatar_url='https://cdn.example/bob.png'
  ),
  'profile: changes persisted');
select tests.ok(
  exists (select 1 from app.audit_log where action='profile.updated'),
  'audit: profile update recorded');

-- =============================================================================
-- ACT 2 — organization request / approval lifecycle
-- =============================================================================

---- Acme: requested by Bob ----------------------------------------------------
select tests.become((select id from _uid where who='bob'));
select tests.run_sql(
  $t$select api.request_organization('Acme Corp', 'acme')$t$,
  'org-admin: request_organization creates org');
insert into _ctx
  select 'org_a',
         tests.scalar($t$select api.get_session_context()->'organizations'->0->>'id'$t$);
select tests.ok((select val from _ctx where key='org_a') is not null,
  'org-admin: new org visible in own session context');
select tests.ok(
  (select tests.scalar(
    $t$select api.get_session_context()->'organizations'->0->>'status'$t$) = 'pending'),
  'org-admin: new organization starts pending');

---- Duplicate slug from another requester ------------------------------------
select tests.become((select id from _uid where who='dave'));
select tests.throws(
  $t$select api.request_organization('Other', 'acme')$t$, '23505',
  'org-admin: duplicate slug rejected');

---- Pending org: admin gets nothing beyond session APIs ----------------------
select tests.become((select id from _uid where who='bob'));
select tests.ok(
  (select tests.scalar('select security.can_perform(''fundraising.view'')') = 'false'),
  'pending-org admin: can_perform denied while pending');
select tests.throws('select api.list_campaigns(null)', '42501',
  'pending-org admin: list_campaigns rejected');
select tests.throws(
  $t$select api.approve_organization(tests.ctx('org_a')::uuid)$t$, '42501',
  'member: approve_organization denied');

---- Sysadmin approves ---------------------------------------------------------
select tests.become((select id from _uid where who='alice'));
select tests.run_sql(
  $t$select api.approve_organization(tests.ctx('org_a')::uuid)$t$,
  'sysadmin: approves pending org');
select tests.reset_actor();
select tests.ok(
  (select status = 'active' from app.organizations where slug='acme'),
  'sysadmin: acme is active after approval');
select tests.become((select id from _uid where who='alice'));
select tests.throws(
  $t$select api.approve_organization(tests.ctx('org_a')::uuid)$t$, '22023',
  'sysadmin: approving non-pending org fails cleanly');

---- Reject flow (erin's charityc) ---------------------------------------------
select tests.become((select id from _uid where who='erin'));
select tests.run_sql(
  $t$select api.request_organization('Charity C', 'charityc')$t$,
  'org-admin: erin requests charityc');
insert into _ctx
  select 'org_c',
         tests.scalar($t$select api.get_session_context()->'organizations'->0->>'id'$t$);
select tests.become((select id from _uid where who='alice'));
select tests.run_sql(
  $t$select api.reject_organization(tests.ctx('org_c')::uuid, 'incomplete docs')$t$,
  'sysadmin: rejects pending org with note');
select tests.throws(
  $t$select api.approve_organization(tests.ctx('org_c')::uuid)$t$, '22023',
  'sysadmin: rejected org cannot be approved');

---- Suspend / unsuspend flow (frank's helpdesk) --------------------------------
select tests.become((select id from _uid where who='frank'));
select tests.run_sql(
  $t$select api.request_organization('Helpdesk', 'helpdesk')$t$,
  'org-admin: frank requests helpdesk');
insert into _ctx
  select 'org_helpdesk',
         tests.scalar($t$select api.get_session_context()->'organizations'->0->>'id'$t$);
select tests.become((select id from _uid where who='alice'));
select tests.run_sql(
  $t$select api.approve_organization(tests.ctx('org_helpdesk')::uuid)$t$,
  'sysadmin: approves helpdesk');
select tests.become((select id from _uid where who='frank'));
select tests.run_sql(
  $t$select api.set_active_organization(tests.ctx('org_helpdesk')::uuid)$t$,
  'org-admin: frank selects helpdesk as active org');
select tests.ok(
  (select tests.scalar(
    $t$select api.get_organization_status()->>'status'$t$) = 'active'),
  'org-admin: status endpoint shows active before suspension');
select tests.become((select id from _uid where who='alice'));
select tests.run_sql(
  $t$select api.suspend_organization(tests.ctx('org_helpdesk')::uuid, 'terms violation')$t$,
  'sysadmin: suspends organization with note');
select tests.become((select id from _uid where who='frank'));
select tests.ok(
  (select tests.scalar(
    $t$select api.get_organization_status()->>'status'$t$) = 'suspended'),
  'suspended-org admin: sees own suspension');
select tests.ok(
  (select tests.scalar(
    $t$select api.get_organization_status()->>'suspension_note'$t$) = 'terms violation'),
  'suspended-org admin: sees suspension reason');
select tests.throws('select api.list_campaigns(null)', '42501',
  'suspended-org admin: API surface blocked while suspended');
select tests.become((select id from _uid where who='alice'));
select tests.run_sql(
  $t$select api.unsuspend_organization(tests.ctx('org_helpdesk')::uuid)$t$,
  'sysadmin: unsuspends organization');
select tests.become((select id from _uid where who='frank'));
select tests.ok(
  (select tests.scalar(
    $t$select api.get_organization_status()->>'status'$t$) = 'active'),
  'org-admin: unsuspended org is active again');

---- Org B for cross-org isolation tests (dave's builders) ----------------------
select tests.become((select id from _uid where who='dave'));
select tests.run_sql(
  $t$select api.request_organization('Builders', 'builders')$t$,
  'org-admin: dave requests builders');
insert into _ctx
  select 'org_b',
         tests.scalar($t$select api.get_session_context()->'organizations'->0->>'id'$t$);
select tests.become((select id from _uid where who='alice'));
select tests.run_sql(
  $t$select api.approve_organization(tests.ctx('org_b')::uuid)$t$,
  'sysadmin: approves builders');

-- =============================================================================
-- ACT 3 — invitations & membership
-- =============================================================================
select tests.become((select id from _uid where who='bob'));
select tests.run_sql(
  $t$select api.set_active_organization(tests.ctx('org_a')::uuid)$t$,
  'org-admin: bob selects acme as active org');

---- Invite carol (single call, capture full payload) --------------------------
insert into _ctx
  select 'inv_carol',
         tests.scalar(
           $t$select api.invite_member('carol@example.com','member',null)::text$t$);
select tests.ok(
  (select tests.ctx('inv_carol')::jsonb->>'token') is not null,
  'org-admin: invite_member returns a token');

-- Token stored hashed (sha256), never in plaintext.
select tests.reset_actor();
select tests.ok(
  exists (
    select 1 from app.organization_invitations i
    where i.id::text = (select tests.ctx('inv_carol')::jsonb->>'invitation_id')
      and i.token_hash = security.token_digest(
            (select tests.ctx('inv_carol')::jsonb->>'token'))
      and i.token_hash <> (select tests.ctx('inv_carol')::jsonb->>'token')
  ),
  'security: invitation token persisted as sha256 hash only');

-- Duplicate pending invite for same email+org.
select tests.become((select id from _uid where who='bob'));
select tests.throws(
  $t$select api.invite_member('carol@example.com','member',null)$t$, '23505',
  'org-admin: duplicate pending invitation rejected');

-- Wrong accepting user: email mismatch.
select tests.become((select id from _uid where who='heidi'));
select tests.throws(
  $t$select api.accept_invitation(tests.ctx('inv_carol')::jsonb->>'token')$t$, '42501',
  'outsider: cannot accept invitation addressed to another email');

-- Correct user accepts; becomes member with active org switched.
select tests.become((select id from _uid where who='carol'));
select tests.ok(
  (select tests.scalar(
    $t$select api.accept_invitation(tests.ctx('inv_carol')::jsonb->>'token')::text$t$
  ) = (select val from _ctx where key='org_a')),
  'member: accept_invitation returns organization id');
select tests.ok(
  (select tests.scalar(
    $t$select api.get_session_context()->>'active_organization_id'$t$
  ) = (select val from _ctx where key='org_a')),
  'member: active organization switched on accept');
select tests.reset_actor();
select tests.ok(
  exists (
    select 1 from app.organization_members om
    join auth.users u on u.id = om.user_id
    where om.organization_id::text = (select val from _ctx where key='org_a')
      and lower(u.email)='carol@example.com'
      and om.role='member'
  ),
  'membership: carol is member of acme');
select tests.become((select id from _uid where who='bob'));
select tests.run_sql('select api.get_organization_members(null)',
  'org-admin: get_organization_members succeeds');
select tests.ok(
  (select tests.scalar('select api.get_organization_members(null)')
    like '%carol@example.com%'),
  'org-admin: member list includes invited member');

-- Expired invitation path.
-- Expired invitation: bob invites grace, ops back-dates expiry.
insert into _ctx
  select 'inv_grace',
         tests.scalar(
           $t$select api.invite_member('grace@example.com','member',null)::text$t$);
select tests.reset_actor();
update app.organization_invitations
set expires_at = now() - interval '1 day'
where id::text = (select val from _ctx where key='inv_grace')::jsonb->>'invitation_id';

select tests.become((select id from _uid where who='grace'));
select tests.throws(
  $t$select api.accept_invitation(tests.ctx('inv_grace')::jsonb->>'token')$t$, '22023',
  'outsider: expired invitation rejected');

-- Revoked invitation: bob invites ivy then revokes.
select tests.become((select id from _uid where who='bob'));
insert into _ctx
  select 'inv_ivy',
         tests.scalar(
           $t$select api.invite_member('ivy@example.com','member',null)::text$t$);
select tests.run_sql(
  $t$select api.revoke_invitation((tests.ctx('inv_ivy')::jsonb->>'invitation_id')::uuid)$t$,
  'org-admin: revoke_invitation succeeds');
select tests.become((select id from _uid where who='ivy'));
select tests.throws(
  $t$select api.accept_invitation(tests.ctx('inv_ivy')::jsonb->>'token')$t$, '22023',
  'outsider: revoked invitation rejected');

-- Outsider cannot invite into an org they do not administer.
select tests.become((select id from _uid where who='grace'));
select tests.throws(
  $t$select api.invite_member('anyone@example.com','member',
    tests.ctx('org_a')::uuid)$t$, '42501',
  'outsider: invite into foreign org denied');

-- =============================================================================
-- ACT 4 — fundraising permission matrix (acme active, basic plan w/ feature)
-- =============================================================================
-- Fixture: acme must hold an entitled subscription before any feature-gated
-- API works — this is itself expected behaviour of the entitlement gate.
select tests.reset_actor();
insert into _ctx
  select 'plan_basic',
         tests.scalar($t$select (select id from app.subscription_plans where code='basic')::text$t$);
select tests.become((select id from _uid where who='alice'));
select tests.run_sql(
  $t$select api.assign_subscription(tests.ctx('org_a')::uuid,
    tests.ctx('plan_basic')::uuid, 'active', now(), null)$t$,
  'subscription: sysadmin assigns basic plan to acme');
select tests.become((select id from _uid where who='bob'));

-- Admin shortcut allows full CRUD.
insert into _ctx
  select 'camp1',
         tests.scalar(
           $t$select api.create_campaign('Build School','school block',10000000,'USD',null,null,null)::text$t$);
select tests.ok(
  (select val from _ctx where key='camp1') is not null,
  'org-admin: create_campaign succeeds');
select tests.run_sql(
  $t$select api.update_campaign(tests.ctx('camp1')::uuid, 'Build School Phase 1',
    null,null,null,null,null)$t$,
  'org-admin: update_campaign succeeds');
select tests.ok(
  (select tests.scalar('select api.list_campaigns(null)') like '%Phase 1%'),
  'org-admin: list_campaigns shows updated campaign');
select tests.reset_actor();
select tests.ok(
  exists (
    select 1 from app.audit_log
    where action='fundraising.campaign_created'
      and entity_id::text = (select val from _ctx where key='camp1')
  ),
  'audit: campaign creation recorded');

-- Plain member: nothing without explicit permissions.
select tests.become((select id from _uid where who='carol'));
select tests.ok(
  (select tests.scalar('select security.can_perform(''fundraising.view'')') = 'false'),
  'member: can_perform false without explicit permission');
select tests.throws('select api.list_campaigns(null)', '42501',
  'member: list_campaigns denied');
select tests.throws(
  $t$select api.create_campaign('Nope',null,null,'USD',null,null,null)$t$, '42501',
  'member: create_campaign denied');

-- Granular grant: view only.
select tests.become((select id from _uid where who='bob'));
select tests.run_sql(
  $t$select api.set_member_permission(
    '33333333-3333-4333-8333-333333333333',
    'fundraising.view', true, null)$t$,
  'org-admin: grants fundraising.view to carol');
select tests.become((select id from _uid where who='carol'));
select tests.ok(
  (select tests.scalar('select security.can_perform(''fundraising.view'')') = 'true'),
  'member: explicit grant makes can_perform true');
select tests.run_sql('select api.list_campaigns(null)',
  'member: list_campaigns allowed with view grant');
select tests.throws(
  $t$select api.create_campaign('Still Nope',null,null,'USD',null,null,null)$t$, '42501',
  'member: create still denied with view-only grant');

-- Grant create; verify granular delete remains separate.
select tests.become((select id from _uid where who='bob'));
select tests.run_sql(
  $t$select api.set_member_permission(
    '33333333-3333-4333-8333-333333333333',
    'fundraising.create', true, null)$t$,
  'org-admin: grants fundraising.create to carol');
select tests.become((select id from _uid where who='carol'));
insert into _ctx
  select 'camp2',
         tests.scalar(
           $t$select api.create_campaign('Food Drive',null,500000,'USD',null,null,null)::text$t$);
select tests.ok((select val from _ctx where key='camp2') is not null,
  'member: create_campaign allowed with create grant');
select tests.throws(
  $t$select api.delete_campaign(tests.ctx('camp2')::uuid)$t$, '42501',
  'member: delete still denied without delete grant');

-- Cross-org isolation: dave cannot touch acme campaigns.
select tests.become((select id from _uid where who='dave'));
select tests.run_sql(
  $t$select api.set_active_organization(tests.ctx('org_b')::uuid)$t$,
  'org-admin: dave selects builders as active org');
select tests.throws(
  $t$select api.update_campaign(tests.ctx('camp1')::uuid, 'Hacked',
    null,null,null,null,null)$t$, '42501',
  'cross-org: update foreign campaign denied');
select tests.throws(
  $t$select api.list_campaigns(tests.ctx('org_a')::uuid)$t$, '42501',
  'cross-org: list foreign org campaigns denied');

-- Entitlement gate: admins do NOT bypass subscription features.
select tests.become((select id from _uid where who='alice'));
select tests.run_sql(
  $t$select api.create_plan('pro','Pro','premium',9900,'USD','month')$t$,
  'sysadmin: create_plan succeeds');
select tests.reset_actor();
insert into _ctx
  select 'plan_pro',
         tests.scalar($t$select (select id from app.subscription_plans where code='pro')::text$t$);
select tests.become((select id from _uid where who='alice'));
select tests.run_sql(
  $t$select api.assign_subscription(tests.ctx('org_a')::uuid,
    tests.ctx('plan_pro')::uuid, 'active', now(), null)$t$,
  'sysadmin: assigns feature-less plan to acme');
select tests.become((select id from _uid where who='bob'));
select tests.ok(
  (select tests.scalar('select security.can_perform(''fundraising.view'')') = 'false'),
  'entitlement: admin denied when plan lacks feature');
select tests.throws('select api.list_campaigns(null)', '42501',
  'entitlement: list_campaigns blocked for unentitled admin');

-- Restore entitled plan; access recovers.
select tests.become((select id from _uid where who='alice'));
select tests.run_sql(
  $t$select api.assign_subscription(tests.ctx('org_a')::uuid,
    tests.ctx('plan_basic')::uuid, 'active', now(), null)$t$,
  'sysadmin: re-assigns basic plan to acme');
select tests.become((select id from _uid where who='bob'));
select tests.run_sql(
  $t$select api.create_campaign('Recovered',null,null,'USD',null,null,null)$t$,
  'entitlement: admin recovers after entitled plan assigned');

-- =============================================================================
-- ACT 5 — subscriptions are system-administered only
-- =============================================================================
select tests.become((select id from _uid where who='dave'));
select tests.throws(
  $t$select api.assign_subscription(tests.ctx('org_b')::uuid,
    tests.ctx('plan_basic')::uuid, 'active', now(), null)$t$, '42501',
  'subscription: org admin CANNOT self-assign plan');
select tests.throws(
  $t$select api.deactivate_subscription(tests.ctx('org_b')::uuid)$t$, '42501',
  'subscription: org admin CANNOT deactivate');

select tests.become((select id from _uid where who='alice'));
select tests.run_sql(
  $t$select api.assign_subscription(tests.ctx('org_b')::uuid,
    tests.ctx('plan_basic')::uuid, 'active', now(), null)$t$,
  'subscription: sysadmin assigns plan to builders');
select tests.become((select id from _uid where who='dave'));
select tests.ok(
  (select tests.scalar(
    $t$select (api.get_current_subscription(null))->>'plan_code'$t$) = 'basic'),
  'subscription: member sees current subscription with plan code');
select tests.ok(
  (select tests.scalar(
    $t$select exists (
      select 1 from jsonb_array_elements_text((api.get_current_subscription(null))->'features') fe
      where fe = 'fundraising')$t$) = 'true'),
  'subscription: member sees entitled features');

select tests.become((select id from _uid where who='alice'));
select tests.run_sql(
  $t$select api.deactivate_subscription(tests.ctx('org_b')::uuid)$t$,
  'subscription: sysadmin deactivates builders');
select tests.become((select id from _uid where who='dave'));
select tests.ok(
  (select tests.scalar('select api.get_current_subscription(null)') = '{}'),
  'subscription: deactivated org has empty subscription');

-- =============================================================================
-- ACT 6 — member management guards
-- =============================================================================
select tests.become((select id from _uid where who='bob'));

-- Promote carol to admin.
select tests.run_sql(
  $t$select api.change_member_role(
    '33333333-3333-4333-8333-333333333333', 'admin', null)$t$,
  'org-admin: promote member to admin');
select tests.reset_actor();
select tests.ok(
  exists (
    select 1 from app.organization_members om
    join auth.users u on u.id = om.user_id
    where om.organization_id::text = (select val from _ctx where key='org_a')
      and lower(u.email)='carol@example.com' and om.role='admin'
  ),
  'membership: promotion persisted');

-- Self-change blocks (both admins).
select tests.become((select id from _uid where who='carol'));
select tests.throws(
  $t$select api.change_member_role(
    '33333333-3333-4333-8333-333333333333', 'member', null)$t$, '22023',
  'org-admin: cannot change own role');
select tests.throws(
  $t$select api.remove_member(
    '33333333-3333-4333-8333-333333333333', null)$t$, '22023',
  'org-admin: cannot remove self');

-- Demote with two admins present is allowed (guard permits count > 1).
select tests.become((select id from _uid where who='bob'));
select tests.run_sql(
  $t$select api.change_member_role(
    '33333333-3333-4333-8333-333333333333', 'member', null)$t$,
  'org-admin: demotion allowed while another admin remains');

-- Remove carol; access evaporates immediately.
select tests.run_sql(
  $t$select api.remove_member(
    '33333333-3333-4333-8333-333333333333', null)$t$,
  'org-admin: remove_member succeeds');
select tests.become((select id from _uid where who='carol'));
select tests.ok(
  (select tests.scalar('select api.get_my_organizations()') not like '%acme%'),
  'removed-member: org gone from own session');
select tests.throws('select api.list_campaigns(null)', '42501',
  'removed-member: API access revoked');

-- Unknown target member errors cleanly.
select tests.become((select id from _uid where who='bob'));
select tests.throws(
  $t$select api.remove_member(
    '88888888-8888-4888-8888-888888888888', null)$t$, '22023',
  'org-admin: removing non-member fails cleanly');

-- =============================================================================
-- ACT 7 — system admin management
-- =============================================================================
select tests.become((select id from _uid where who='alice'));
select tests.run_sql(
  $t$select api.grant_system_admin(
    '22222222-2222-4222-8222-222222222222')$t$,
  'sysadmin: grant_system_admin to bob');
select tests.become((select id from _uid where who='bob'));
select tests.ok(
  (select tests.scalar('select security.is_system_admin()') = 'true'),
  'sysadmin: bob now system admin');

-- Org admin without sysadmin rights cannot grant (carol re-invite first).
select tests.become((select id from _uid where who='dave'));
select tests.throws(
  $t$select api.grant_system_admin(
    '77777777-7777-4777-8777-777777777777')$t$, '42501',
  'org-admin: grant_system_admin denied for non-sysadmin');

-- Revoke alice (two admins -> one); alice loses powers.
select tests.become((select id from _uid where who='bob'));
select tests.run_sql(
  $t$select api.revoke_system_admin(
    '11111111-1111-4111-8111-111111111111')$t$,
  'sysadmin: revoke_system_admin alice');
select tests.become((select id from _uid where who='alice'));
select tests.ok(
  (select tests.scalar('select security.is_system_admin()') = 'false'),
  'sysadmin: alice no longer system admin');
select tests.throws(
  $t$select api.create_plan('x2','X2','',0,'USD','month')$t$, '42501',
  'sysadmin: ex-admin loses system APIs');

-- Last-admin protection on revoke path.
select tests.become((select id from _uid where who='bob'));
select tests.throws(
  $t$select api.revoke_system_admin(
    '22222222-2222-4222-8222-222222222222')$t$, '22023',
  'sysadmin: cannot revoke the last system admin');
select tests.run_sql(
  $t$select api.grant_system_admin(
    '11111111-1111-4111-8111-111111111111')$t$,
  'sysadmin: restore alice as system admin');

-- =============================================================================
-- ACT 8 — sealed surfaces stay sealed
-- =============================================================================
select tests.become((select id from _uid where who='bob'));
select tests.throws('select count(*) from app.system_admins', '42501',
  'sealed: system_admins table inaccessible');
select tests.throws('select count(*) from app.audit_log', '42501',
  'sealed: audit_log table inaccessible');
select tests.throws('select count(*) from app.subscription_plans', '42501',
  'sealed: subscription_plans table inaccessible');
select tests.ok(
  (select tests.scalar(
    $t$select security.has_feature(tests.ctx('org_a')::uuid, 'fundraising')::text$t$
  ) = 'true'),
  'client-helper: granted security.has_feature callable by authenticated');

-- =============================================================================
-- Final report
-- =============================================================================
select tests.reset_actor();

do $report$
declare
  v_pass bigint;
  v_fail bigint;
  r record;
begin
  select count(*) filter (where outcome), count(*) filter (where not outcome)
    into v_pass, v_fail
  from tests.results;

  raise info '----------------------------------------';
  raise info 'BEHAVIOUR TESTS  PASS: %   FAIL: %', v_pass, v_fail;

  if v_fail > 0 then
    for r in select label from tests.results where not outcome loop
      raise info 'FAILED: %', r.label;
    end loop;
  end if;
  raise info '----------------------------------------';

  if v_fail > 0 then
    raise exception 'BEHAVIOUR TESTS FAILED: % failure(s)', v_fail;
  end if;
end;
$report$;

rollback;
