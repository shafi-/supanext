-- Migration: org layer -> user-centric model
-- Drops: organizations, organization_members, organization_member_permissions,
--        organization_invitations, organization_subscriptions
-- Adds: user_subscriptions, platform_invitations
-- Modifies: fundraising_campaigns (org_id -> user_id), profiles (drop active_org)

begin;

-- Drop org-dependent objects first
drop function if exists api.get_session_context() cascade;
drop function if exists api.set_active_organization(uuid) cascade;
drop function if exists api.get_my_organizations() cascade;
drop function if exists api.request_organization(text, text) cascade;
drop function if exists api.approve_organization(uuid) cascade;
drop function if exists api.reject_organization(uuid, text) cascade;
drop function if exists api.suspend_organization(uuid, text) cascade;
drop function if exists api.unsuspend_organization(uuid) cascade;
drop function if exists api.get_organization_status(uuid) cascade;
drop function if exists api.invite_member(text, app.organization_role, uuid) cascade;
drop function if exists api.accept_invitation(text) cascade;
drop function if exists api.revoke_invitation(uuid) cascade;
drop function if exists api.change_member_role(uuid, app.organization_role, uuid) cascade;
drop function if exists api.remove_member(uuid, uuid) cascade;
drop function if exists api.set_member_permission(uuid, text, boolean, uuid) cascade;
drop function if exists api.get_organization_members(uuid) cascade;
drop function if exists api.get_current_subscription(uuid) cascade;
drop function if exists api.assign_subscription(uuid, uuid, app.subscription_status, timestamptz, timestamptz) cascade;
drop function if exists api.deactivate_subscription(uuid) cascade;
drop function if exists api.list_campaigns(uuid) cascade;
drop function if exists api.create_campaign(text, text, bigint, text, timestamptz, timestamptz, uuid) cascade;
drop function if exists api.list_public_organizations(int) cascade;
drop function if exists api.get_invitation_preview(text) cascade;
drop function if exists api.list_all_organizations(int) cascade;

drop function if exists security.is_org_member(uuid) cascade;
drop function if exists security.is_org_admin(uuid) cascade;
drop function if exists security.has_role_in_active_org(uuid) cascade;
drop function if exists security.has_explicit_permission(uuid, text) cascade;
drop function if exists security.has_feature(uuid, text) cascade;
drop function if exists security.can_perform(text, uuid) cascade;

drop trigger if exists organizations_set_updated_at on app.organizations cascade;
drop trigger if exists organization_members_set_updated_at on app.organization_members cascade;
drop trigger if exists subscriptions_set_updated_at on app.organization_subscriptions cascade;

-- Drop tables (order matters for FKs)
drop table if exists app.organization_member_permissions cascade;
drop table if exists app.organization_members cascade;
drop table if exists app.organization_invitations cascade;
drop table if exists app.organization_subscriptions cascade;
drop table if exists app.organizations cascade;

-- Drop enums
drop type if exists app.organization_status cascade;
drop type if exists app.organization_role cascade;
drop type if exists app.invitation_status cascade;
drop type if exists app.permission_scope cascade;

-- Remove active_organization_id from profiles
alter table app.profiles drop column if exists active_organization_id;
drop index if exists profiles_active_org_idx;

-- Add user_id to campaigns, drop organization_id (cascade drops dependent policies
-- that reference organization_id; user-centric replaces them with user_id-based ones below).
alter table app.fundraising_campaigns drop column if exists organization_id cascade;
alter table app.fundraising_campaigns add column if not exists user_id uuid not null references auth.users(id) on delete cascade;
-- Switch campaign id to ULID for time-sortable pagination
alter table app.fundraising_campaigns
  alter column id type text using security.generate_ulid(),
  alter column id set default security.generate_ulid();
alter table app.fundraising_campaigns
  alter column created_by type text using created_by::text;
create index if not exists fundraising_campaigns_user_idx on app.fundraising_campaigns(user_id, created_at desc);

-- Update existing campaigns: assign to the first admin of the org they belonged to (if data exists)
-- This is a data migration - in practice, dev environments should be reset.

-- ---------------------------------------------------------------------------
-- New: user_subscriptions
-- ---------------------------------------------------------------------------
create table if not exists app.user_subscriptions (
  id text primary key default security.generate_ulid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id text not null references app.subscription_plans(id),
  status app.subscription_status not null default 'active',
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  external_customer_id text,
  external_subscription_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or ends_at >= starts_at)
);

create unique index if not exists one_current_subscription_per_user
  on app.user_subscriptions(user_id)
  where status in ('trialing', 'active', 'past_due');

create index if not exists user_subscriptions_user_idx
  on app.user_subscriptions(user_id);

drop trigger if exists user_subscriptions_set_updated_at on app.user_subscriptions;
create trigger user_subscriptions_set_updated_at before update on app.user_subscriptions
for each row execute function app.set_updated_at();

-- ---------------------------------------------------------------------------
-- New: platform_invitations (admin -> user, no org scope)
-- ---------------------------------------------------------------------------
do $$ begin
  create type app.platform_invitation_status as enum ('pending', 'accepted', 'revoked', 'expired');
exception when duplicate_object then null; end $$;

create table if not exists app.platform_invitations (
  id text primary key default security.generate_ulid(),
  email text not null,
  token_hash text not null unique,
  invited_by uuid not null references auth.users(id),
  status app.platform_invitation_status not null default 'pending',
  expires_at timestamptz not null,
  accepted_by uuid references auth.users(id),
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  check (email = lower(trim(email))),
  check ((status = 'accepted') = (accepted_at is not null)),
  check ((status = 'revoked') = (revoked_at is not null))
);

create index if not exists platform_invitations_email_idx on app.platform_invitations(email, status);
create index if not exists platform_invitations_token_idx on app.platform_invitations(token_hash);

create unique index if not exists platform_invitations_one_pending_email_idx
  on app.platform_invitations(email)
  where status = 'pending';

alter table app.platform_invitations enable row level security;

-- ---------------------------------------------------------------------------
-- Security helpers (simplified, no org scope)
-- ---------------------------------------------------------------------------
create or replace function security.is_system_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from app.system_admins sa where sa.user_id = auth.uid()
  );
$$;

create or replace function security.has_user_subscription(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from app.user_subscriptions us
    where us.user_id = p_user_id
      and us.status in ('trialing', 'active', 'past_due')
      and us.starts_at <= now()
      and (us.ends_at is null or us.ends_at > now())
  );
$$;

create or replace function security.has_user_feature(p_user_id uuid, p_feature text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from app.user_subscriptions us
    join app.plan_features pf on pf.plan_id = us.plan_id
    join app.features f on f.id = pf.feature_id
    where us.user_id = p_user_id
      and us.status in ('trialing', 'active', 'past_due')
      and us.starts_at <= now()
      and (us.ends_at is null or us.ends_at > now())
      and f.code = p_feature
  );
$$;

-- ---------------------------------------------------------------------------
-- API: session context (user-centric, no org)
-- ---------------------------------------------------------------------------
create or replace function api.get_session_context()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_result jsonb;
begin
  if v_user_id is null then
    raise exception using errcode = '28000', message = 'Not authenticated';
  end if;

  select jsonb_build_object(
    'user_id', v_user_id,
    'display_name', coalesce(pr.display_name, ''),
    'is_system_admin', security.is_system_admin()
  ) into v_result
  from app.profiles pr where pr.id = v_user_id;

  return v_result;
end;
$$;

-- ---------------------------------------------------------------------------
-- API: profile (already exists, no org references needed)
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- API: subscriptions (user-based)
-- ---------------------------------------------------------------------------
create or replace function api.get_my_subscription()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_result jsonb;
begin
  if v_user_id is null then
    raise exception using errcode = '28000', message = 'Not authenticated';
  end if;

  select jsonb_build_object(
    'id', us.id,
    'plan_id', sp.id,
    'plan_code', sp.code,
    'plan_name', sp.name,
    'status', us.status,
    'starts_at', us.starts_at,
    'ends_at', us.ends_at,
    'features', coalesce((
      select jsonb_agg(f.code order by f.code)
      from app.plan_features pf
      join app.features f on f.id = pf.feature_id
      where pf.plan_id = sp.id
    ), '[]'::jsonb)
  ) into v_result
  from app.user_subscriptions us
  join app.subscription_plans sp on sp.id = us.plan_id
  where us.user_id = v_user_id
    and us.status in ('trialing', 'active', 'past_due')
  order by us.starts_at desc
  limit 1;

  return coalesce(v_result, '{}'::jsonb);
end;
$$;

create or replace function api.assign_user_subscription(
  p_user_id uuid,
  p_plan_id text,
  p_status app.subscription_status default 'active',
  p_starts_at timestamptz default now(),
  p_ends_at timestamptz default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare v_id text;
begin
  if not security.is_system_admin() then
    raise exception using errcode = '42501', message = 'Not authorized';
  end if;

  if not exists (select 1 from app.profiles where id = p_user_id) then
    raise exception using errcode = '22023', message = 'User not found';
  end if;

  update app.user_subscriptions
  set status = 'expired', ends_at = least(coalesce(ends_at, now()), now())
  where user_id = p_user_id
    and status in ('trialing', 'active', 'past_due');

  insert into app.user_subscriptions(user_id, plan_id, status, starts_at, ends_at)
  values (p_user_id, p_plan_id, p_status, p_starts_at, p_ends_at)
  returning id into v_id;

  insert into app.audit_log(actor_user_id, action, entity_type, entity_id)
  values (auth.uid(), 'subscription.assigned', 'subscription', v_id);

  return v_id;
end;
$$;

create or replace function api.deactivate_user_subscription(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare v_id text;
begin
  if not security.is_system_admin() then
    raise exception using errcode = '42501', message = 'Not authorized';
  end if;

  update app.user_subscriptions
  set status = 'canceled', ends_at = least(coalesce(ends_at, now()), now())
  where user_id = p_user_id
    and status in ('trialing', 'active', 'past_due')
  returning id into v_id;

  if not found then
    raise exception using errcode = '22023', message = 'No active subscription for this user';
  end if;

  insert into app.audit_log(actor_user_id, action, entity_type, entity_id)
  values (auth.uid(), 'subscription.canceled', 'subscription', v_id);
end;
$$;

-- ---------------------------------------------------------------------------
-- API: campaigns (user-based)
-- ---------------------------------------------------------------------------
create or replace function api.list_my_campaigns(
  p_limit int default 20,
  p_cursor text default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_result jsonb;
begin
  if v_user_id is null then
    raise exception using errcode = '28000', message = 'Not authenticated';
  end if;

  select coalesce(jsonb_agg(to_jsonb(c) order by c.id desc), '[]'::jsonb)
  into v_result
  from (
    select * from app.fundraising_campaigns fc
    where fc.user_id = v_user_id
      and (p_cursor is null or fc.id < p_cursor)
    order by fc.id desc
    limit least(greatest(p_limit, 1), 100)
  ) c;

  return v_result;
end;
$$;

create or replace function api.create_campaign(
  p_name text,
  p_description text default null,
  p_goal_minor bigint default null,
  p_currency text default 'USD',
  p_starts_at timestamptz default null,
  p_ends_at timestamptz default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_id text;
begin
  if v_user_id is null then
    raise exception using errcode = '28000', message = 'Not authenticated';
  end if;

  insert into app.fundraising_campaigns(
    user_id, name, description, goal_minor, currency, starts_at, ends_at, created_by
  )
  values (
    v_user_id, trim(p_name), p_description, p_goal_minor, upper(p_currency), p_starts_at, p_ends_at, v_user_id
  )
  returning id into v_id;

  insert into app.audit_log(actor_user_id, action, entity_type, entity_id)
  values (v_user_id, 'fundraising.campaign_created', 'fundraising_campaign', v_id);

  return v_id;
end;
$$;

create or replace function api.update_campaign(
  p_campaign_id text,
  p_name text default null,
  p_description text default null,
  p_goal_minor bigint default null,
  p_currency text default null,
  p_starts_at timestamptz default null,
  p_ends_at timestamptz default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception using errcode = '28000', message = 'Not authenticated';
  end if;

  if not exists (
    select 1 from app.fundraising_campaigns
    where id = p_campaign_id and user_id = v_user_id
  ) then
    raise exception using errcode = '42501', message = 'Not authorized';
  end if;

  update app.fundraising_campaigns
  set name = coalesce(trim(p_name), name),
      description = coalesce(p_description, description),
      goal_minor = coalesce(p_goal_minor, goal_minor),
      currency = coalesce(upper(p_currency), currency),
      starts_at = coalesce(p_starts_at, starts_at),
      ends_at = coalesce(p_ends_at, ends_at)
  where id = p_campaign_id and user_id = v_user_id;
end;
$$;

create or replace function api.delete_campaign(p_campaign_id text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception using errcode = '28000', message = 'Not authenticated';
  end if;

  delete from app.fundraising_campaigns
  where id = p_campaign_id and user_id = v_user_id;

  if not found then
    raise exception using errcode = '42501', message = 'Not authorized';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- API: platform invitations (admin invites user to platform)
-- ---------------------------------------------------------------------------
create or replace function api.invite_platform_user(p_email text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invitation_id text;
  v_token text;
  v_hash text;
  v_email text := lower(trim(p_email));
begin
  if not security.is_system_admin() then
    raise exception using errcode = '42501', message = 'Not authorized';
  end if;

  if v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception using errcode = '22023', message = 'Invalid email address';
  end if;

  v_token := security.random_token_hex();
  v_hash := security.token_digest(v_token);

  insert into app.platform_invitations(email, token_hash, invited_by, expires_at)
  values (v_email, v_hash, auth.uid(), now() + interval '7 days')
  returning id into v_invitation_id;

  insert into app.audit_log(actor_user_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), 'platform.user_invited', 'invitation', v_invitation_id,
          jsonb_build_object('email', v_email));

  return jsonb_build_object(
    'invitation_id', v_invitation_id,
    'token', v_token,
    'expires_at', now() + interval '7 days'
  );
exception when unique_violation then
  raise exception using errcode = '23505', message = 'A pending invitation already exists for this email';
end;
$$;

create or replace function api.accept_platform_invitation(p_token text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_hash text := security.token_digest(p_token);
  v_inv app.platform_invitations%rowtype;
begin
  if v_user_id is null then
    raise exception using errcode = '28000', message = 'Not authenticated';
  end if;

  select * into v_inv
  from app.platform_invitations i
  where i.token_hash = v_hash
  for update;

  if not found then
    raise exception using errcode = '22023', message = 'INV01: Invitation not found';
  end if;

  if v_inv.status <> 'pending' or v_inv.expires_at <= now() then
    raise exception using errcode = '22023', message = 'INV02: Invitation expired or already used';
  end if;

  update app.platform_invitations
  set status = 'accepted', accepted_by = v_user_id, accepted_at = now()
  where id = v_inv.id;

  insert into app.audit_log(actor_user_id, action, entity_type, entity_id)
  values (v_user_id, 'platform.invitation_accepted', 'invitation', v_inv.id);

  return true;
end;
$$;

create or replace function api.revoke_platform_invitation(p_invitation_id text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not security.is_system_admin() then
    raise exception using errcode = '42501', message = 'Not authorized';
  end if;

  update app.platform_invitations
  set status = 'revoked', revoked_at = now()
  where id = p_invitation_id and status = 'pending';
end;
$$;

create or replace function api.get_platform_invitation_preview(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_result jsonb;
begin
  if p_token is null or length(btrim(p_token)) = 0 then
    raise exception using errcode = '22023', message = 'INV01: Invitation not found';
  end if;

  select jsonb_build_object(
    'inviter_name', coalesce(pr.display_name, ''),
    'expires_at', i.expires_at
  ) into v_result
  from app.platform_invitations i
  left join app.profiles pr on pr.id = i.invited_by
  where i.token_hash = security.token_digest(p_token)
    and i.status = 'pending'
    and i.expires_at > now();

  if v_result is null then
    if exists (
      select 1 from app.platform_invitations
      where token_hash = security.token_digest(p_token)
    ) then
      raise exception using errcode = '22023', message = 'INV02: Invitation expired or already used';
    else
      raise exception using errcode = '22023', message = 'INV01: Invitation not found';
    end if;
  end if;

  return v_result;
end;
$$;

-- ---------------------------------------------------------------------------
-- API: system admin - list users
-- ---------------------------------------------------------------------------
-- Note: auth.users.id is UUID (managed by Supabase), not ULID. So we order/filter
-- by created_at desc — this can have ties on users with same signup instant,
-- which is rare in practice.
create or replace function api.list_all_users(p_limit int default 200, p_cursor text default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not security.is_system_admin() then
    raise exception using errcode = '42501', message = 'Not authorized';
  end if;

  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', u.id::text,
      'email', u.email,
      'display_name', pr.display_name,
      'created_at', u.created_at,
      'is_system_admin', exists(select 1 from app.system_admins sa where sa.user_id = u.id),
      'has_subscription', security.has_user_subscription(u.id::text)
    ) order by u.created_at desc)
    from auth.users u
    left join app.profiles pr on pr.id = u.id
    where (p_cursor is null or u.created_at < p_cursor::timestamptz)
    order by u.created_at desc
    limit least(greatest(coalesce(p_limit, 200), 1), 500)
  ), '[]'::jsonb);
end;
$$;

-- List subscriptions (admin view)
-- Orders by subscription id (ULID, time-sortable) so cursor pagination is
-- deterministic and consistent with the WHERE filter.
create or replace function api.list_all_subscriptions(p_limit int default 200, p_cursor text default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not security.is_system_admin() then
    raise exception using errcode = '42501', message = 'Not authorized';
  end if;

  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', us.id,
      'user_id', us.user_id::text,
      'email', u.email,
      'display_name', pr.display_name,
      'plan_id', sp.id,
      'plan_code', sp.code,
      'plan_name', sp.name,
      'status', us.status,
      'starts_at', us.starts_at,
      'ends_at', us.ends_at
    ) order by us.id desc)
    from app.user_subscriptions us
    join auth.users u on u.id = us.user_id
    left join app.profiles pr on pr.id = us.user_id
    join app.subscription_plans sp on sp.id = us.plan_id
    where (p_cursor is null or us.id < p_cursor)
    order by us.id desc
    limit least(greatest(coalesce(p_limit, 200), 1), 500)
  ), '[]'::jsonb);
end;
$$;

-- List plans
create or replace function api.list_plans()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not security.is_system_admin() then
    raise exception using errcode = '42501', message = 'Not authorized';
  end if;

  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', sp.id, 'code', sp.code, 'name', sp.name, 'description', sp.description,
      'price_minor', sp.price_minor, 'currency', sp.currency,
      'billing_interval', sp.billing_interval, 'is_active', sp.is_active,
      'features', coalesce((
        select jsonb_agg(f.code order by f.code)
        from app.plan_features pf join app.features f on f.id=pf.feature_id
        where pf.plan_id=sp.id),'[]'::jsonb)
    ) order by sp.id desc)
    from app.subscription_plans sp
  ), '[]'::jsonb);
end;
$$;

-- find_user_id_by_email (keep as-is)
drop function if exists api.find_user_id_by_email(text) cascade;
create or replace function api.find_user_id_by_email(p_email text)
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
begin
  if not security.is_system_admin() then
    raise exception using errcode = '42501', message = 'Not authorized';
  end if;

  select u.id into v_user_id
  from auth.users u
  where lower(u.email) = lower(btrim(p_email))
  limit 1;

  return v_user_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- RLS updates
-- ---------------------------------------------------------------------------
alter table app.fundraising_campaigns disable row level security;
alter table app.fundraising_campaigns enable row level security;

drop policy if exists campaigns_select on app.fundraising_campaigns;
create policy campaigns_select on app.fundraising_campaigns
for select to authenticated
using (user_id = auth.uid() or security.is_system_admin());

drop policy if exists campaigns_insert on app.fundraising_campaigns;
create policy campaigns_insert on app.fundraising_campaigns
for insert to authenticated
with check (user_id = auth.uid() or security.is_system_admin());

drop policy if exists campaigns_update on app.fundraising_campaigns;
create policy campaigns_update on app.fundraising_campaigns
for update to authenticated
using (user_id = auth.uid() or security.is_system_admin())
with check (user_id = auth.uid() or security.is_system_admin());

drop policy if exists campaigns_delete on app.fundraising_campaigns;
create policy campaigns_delete on app.fundraising_campaigns
for delete to authenticated
using (user_id = auth.uid() or security.is_system_admin());

-- Subscriptions RLS
alter table app.user_subscriptions disable row level security;
alter table app.user_subscriptions enable row level security;

drop policy if exists user_subscriptions_select on app.user_subscriptions;
create policy user_subscriptions_select on app.user_subscriptions
for select to authenticated
using (user_id = auth.uid() or security.is_system_admin());

-- Platform invitations: only system admins can read
drop policy if exists platform_invitations_select on app.platform_invitations;
create policy platform_invitations_select on app.platform_invitations
for select to authenticated
using (security.is_system_admin());

-- ---------------------------------------------------------------------------
-- Grant execute on new functions
-- ---------------------------------------------------------------------------
grant execute on function api.get_session_context() to authenticated;
grant execute on function api.get_my_subscription() to authenticated;
grant execute on function api.list_my_campaigns(int, text) to authenticated;
grant execute on function api.create_campaign(text, text, bigint, text, timestamptz, timestamptz) to authenticated;
grant execute on function api.update_campaign(text, text, text, bigint, text, timestamptz, timestamptz) to authenticated;
grant execute on function api.delete_campaign(text) to authenticated;
grant execute on function api.list_all_users(int, text) to authenticated;
grant execute on function api.list_all_subscriptions(int, text) to authenticated;
grant execute on function api.list_plans() to authenticated;
grant execute on function api.find_user_id_by_email(text) to authenticated;
grant execute on function api.assign_user_subscription(uuid, text, app.subscription_status, timestamptz, timestamptz) to authenticated;
grant execute on function api.deactivate_user_subscription(uuid) to authenticated;
grant execute on function api.invite_platform_user(text) to authenticated;
grant execute on function api.accept_platform_invitation(text) to authenticated;
grant execute on function api.revoke_platform_invitation(text) to authenticated;
grant execute on function api.get_platform_invitation_preview(text) to anon, authenticated;
grant execute on function api.grant_system_admin(uuid) to authenticated;
grant execute on function api.revoke_system_admin(uuid) to authenticated;

-- Revoke old functions that no longer exist. The function/type may already
-- be gone (dropped above), so swallow any "does not exist" errors.
do $$
begin
  begin revoke execute on function api.get_organization_members(uuid) from authenticated; exception when others then raise notice 'skip: get_organization_members'; end;
  begin revoke execute on function api.change_member_role(uuid, app.organization_role, uuid) from authenticated; exception when others then raise notice 'skip: change_member_role'; end;
  begin revoke execute on function api.remove_member(uuid, uuid) from authenticated; exception when others then raise notice 'skip: remove_member'; end;
  begin revoke execute on function api.set_member_permission(uuid, text, boolean, uuid) from authenticated; exception when others then raise notice 'skip: set_member_permission'; end;
  begin revoke execute on function api.invite_member(text, app.organization_role, uuid) from authenticated; exception when others then raise notice 'skip: invite_member'; end;
  begin revoke execute on function api.accept_invitation(text) from authenticated; exception when others then raise notice 'skip: accept_invitation'; end;
  begin revoke execute on function api.revoke_invitation(uuid) from authenticated; exception when others then raise notice 'skip: revoke_invitation'; end;
  begin revoke execute on function api.get_current_subscription(uuid) from authenticated; exception when others then raise notice 'skip: get_current_subscription'; end;
  begin revoke execute on function api.assign_subscription(uuid, uuid, app.subscription_status, timestamptz, timestamptz) from authenticated; exception when others then raise notice 'skip: assign_subscription'; end;
  begin revoke execute on function api.deactivate_subscription(uuid) from authenticated; exception when others then raise notice 'skip: deactivate_subscription'; end;
  begin revoke execute on function api.request_organization(text, text) from authenticated; exception when others then raise notice 'skip: request_organization'; end;
  begin revoke execute on function api.approve_organization(uuid) from authenticated; exception when others then raise notice 'skip: approve_organization'; end;
  begin revoke execute on function api.reject_organization(uuid, text) from authenticated; exception when others then raise notice 'skip: reject_organization'; end;
  begin revoke execute on function api.suspend_organization(uuid, text) from authenticated; exception when others then raise notice 'skip: suspend_organization'; end;
  begin revoke execute on function api.unsuspend_organization(uuid) from authenticated; exception when others then raise notice 'skip: unsuspend_organization'; end;
  begin revoke execute on function api.get_organization_status(uuid) from authenticated; exception when others then raise notice 'skip: get_organization_status'; end;
  begin revoke execute on function api.set_active_organization(uuid) from authenticated; exception when others then raise notice 'skip: set_active_organization'; end;
  begin revoke execute on function api.get_my_organizations() from authenticated; exception when others then raise notice 'skip: get_my_organizations'; end;
  begin revoke execute on function api.list_all_organizations(int) from authenticated; exception when others then raise notice 'skip: list_all_organizations'; end;
  begin revoke execute on function api.list_public_organizations(int) from anon, authenticated; exception when others then raise notice 'skip: list_public_organizations'; end;
  begin revoke execute on function api.get_invitation_preview(text) from anon, authenticated; exception when others then raise notice 'skip: get_invitation_preview'; end;
  begin revoke execute on function api.list_campaigns(uuid) from authenticated; exception when others then raise notice 'skip: list_campaigns'; end;
end $$;

commit;
