-- Supabase initial migration
-- Multi-tenant SaaS: organizations, memberships, invitations,
-- permissions, plans/subscriptions, fundraising campaigns, API RPCs and RLS.

begin;

create schema if not exists app;
create schema if not exists security;
create schema if not exists api;

-- pgcrypto lives in the security schema. Its low-level primitives may remain
-- PUBLIC-executable depending on host ownership, so all token material is
-- generated ONLY through the postgres-owned wrappers defined below, which are
-- sealed by the blanket revoke at the end of this migration.
do $$
declare
  v_ext_schema text;
begin
  select extnamespace::regnamespace::text into v_ext_schema
  from pg_extension where extname = 'pgcrypto';

  if v_ext_schema is null then
    create extension pgcrypto with schema security;
  elsif v_ext_schema <> 'security' then
    execute 'alter extension pgcrypto set schema security';
  end if;
end $$;

-- Token-material wrappers. Owned by the migration role, therefore actually
-- sealable. Never expose raw gen_random_bytes/digest reliance to clients.
create or replace function security.random_token_hex()
returns text
language sql
volatile
security definer
set search_path = ''
as $$
  select encode(security.gen_random_bytes(32), 'hex');
$$;

create or replace function security.token_digest(p_token text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select encode(security.digest(p_token, 'sha256'), 'hex');
$$;

-- ULID: 26 chars Crockford Base32. First 10 = timestamp (48-bit ms-since-epoch),
-- next 16 = randomness. Time-sortable — sorting by id desc gives newest first.
-- Filter and order by id are now consistent — fixes broken pagination.
create or replace function security.generate_ulid()
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  t_ms bigint := (extract(epoch from clock_timestamp()) * 1000)::bigint;
  rand_bytes bytea := gen_random_bytes(10);
  t_chars text := '';
  r_chars text := '';
  alphabet text := '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
begin
  -- Encode timestamp as 10 Crockford base32 chars (LSB first, reversed to MSB first)
  for i in 1..10 loop
    t_chars := substr(alphabet, (t_ms % 32)::int + 1, 1) || t_chars;
    t_ms := t_ms / 32;
  end loop;

  -- Encode 10 random bytes as 16 base32 chars (5 bits per char, 80 bits / 5 = 16)
  for i in 0..15 loop
    if i % 2 = 0 then
      r_chars := r_chars || substr(alphabet, (get_byte(rand_bytes, i / 2) >> 4) + 1, 1);
    else
      r_chars := r_chars || substr(alphabet, (get_byte(rand_bytes, i / 2) & 15) + 1, 1);
    end if;
  end loop;

  return t_chars || r_chars;
end;
$$;

revoke all on schema app from public, anon, authenticated;
revoke all on schema security from public, anon, authenticated;
revoke all on schema api from public;
grant usage on schema api to anon, authenticated;

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------

do $$ begin
  create type app.organization_status as enum ('pending', 'active', 'suspended', 'rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type app.organization_role as enum ('admin', 'member');
exception when duplicate_object then null; end $$;

do $$ begin
  create type app.invitation_status as enum ('pending', 'accepted', 'revoked', 'expired');
exception when duplicate_object then null; end $$;

do $$ begin
  create type app.subscription_status as enum ('trialing', 'active', 'past_due', 'canceled', 'expired');
exception when duplicate_object then null; end $$;

do $$ begin
  create type app.permission_scope as enum ('system', 'organization');
exception when duplicate_object then null; end $$;

-- -----------------------------------------------------------------------------
-- Common trigger helpers
-- -----------------------------------------------------------------------------
create or replace function app.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- Profiles / identity
-- -----------------------------------------------------------------------------
create table if not exists app.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  active_organization_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_active_org_idx
  on app.profiles(active_organization_id);

create or replace function app.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into app.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function app.handle_new_user();

-- -----------------------------------------------------------------------------
-- Organizations
-- -----------------------------------------------------------------------------
create table if not exists app.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 200),
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$'),
  status app.organization_status not null default 'pending',
  created_by uuid not null references auth.users(id),
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  suspended_by uuid references auth.users(id),
  suspended_at timestamptz,
  suspension_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status = 'suspended') = (suspended_at is not null)),
  check ((status = 'suspended') = (suspension_note is not null))
);

create index if not exists organizations_status_idx on app.organizations(status);
create index if not exists organizations_created_by_idx on app.organizations(created_by);

create table if not exists app.organization_members (
  organization_id uuid not null references app.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role app.organization_role not null default 'member',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create index if not exists organization_members_user_idx
  on app.organization_members(user_id, organization_id);

create index if not exists organization_members_org_role_idx
  on app.organization_members(organization_id, role);

-- -----------------------------------------------------------------------------
-- System administrators
-- -----------------------------------------------------------------------------
create table if not exists app.system_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Permissions / features
-- -----------------------------------------------------------------------------
create table if not exists app.features (
  id text primary key default security.generate_ulid(),
  code text not null unique,
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists app.permissions (
  id text primary key default security.generate_ulid(),
  code text not null unique,
  name text not null,
  description text,
  scope app.permission_scope not null default 'organization',
  feature_id text references app.features(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists permissions_feature_idx on app.permissions(feature_id);

create table if not exists app.organization_member_permissions (
  organization_id uuid not null,
  user_id uuid not null,
  permission_id text not null references app.permissions(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id, permission_id),
  foreign key (organization_id, user_id)
    references app.organization_members(organization_id, user_id)
    on delete cascade
);

create index if not exists member_permissions_user_org_idx
  on app.organization_member_permissions(user_id, organization_id);

-- -----------------------------------------------------------------------------
-- Invitations
-- -----------------------------------------------------------------------------
create table if not exists app.organization_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references app.organizations(id) on delete cascade,
  email text not null,
  role app.organization_role not null,
  token_hash text not null unique,
  invited_by uuid not null references auth.users(id),
  status app.invitation_status not null default 'pending',
  expires_at timestamptz not null,
  accepted_by uuid references auth.users(id),
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  check (email = lower(trim(email))),
  check ((status = 'accepted') = (accepted_at is not null)),
  check ((status = 'revoked') = (revoked_at is not null))
);

create index if not exists invitations_org_idx on app.organization_invitations(organization_id);
create index if not exists invitations_email_idx on app.organization_invitations(email, status);
create index if not exists invitations_token_idx on app.organization_invitations(token_hash);

create unique index if not exists invitations_one_pending_email_org_idx
  on app.organization_invitations(organization_id, email)
  where status = 'pending';

-- -----------------------------------------------------------------------------
-- Subscription plans / entitlements
-- -----------------------------------------------------------------------------
create table if not exists app.subscription_plans (
  id text primary key default security.generate_ulid(),
  code text not null unique,
  name text not null,
  description text,
  price_minor bigint not null default 0 check (price_minor >= 0),
  currency text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  billing_interval text not null default 'month' check (billing_interval in ('month', 'year', 'one_time')),
  is_active boolean not null default true,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists app.plan_features (
  plan_id text not null references app.subscription_plans(id) on delete cascade,
  feature_id text not null references app.features(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (plan_id, feature_id)
);

create table if not exists app.organization_subscriptions (
  id text primary key default security.generate_ulid(),
  organization_id uuid not null references app.organizations(id) on delete cascade,
  plan_id text not null references app.subscription_plans(id),
  status app.subscription_status not null default 'active',
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  external_customer_id text,
  external_subscription_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- >= (not >) so lifecycle transitions may end a subscription in the same
  -- instant it started without tripping the constraint.
  check (ends_at is null or ends_at >= starts_at)
);

create unique index if not exists one_current_subscription_per_org
  on app.organization_subscriptions(organization_id)
  where status in ('trialing', 'active', 'past_due');

create index if not exists org_subscriptions_org_idx
  on app.organization_subscriptions(organization_id);

-- -----------------------------------------------------------------------------
-- Fundraising campaigns
-- -----------------------------------------------------------------------------
create table if not exists app.fundraising_campaigns (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references app.organizations(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 200),
  description text,
  goal_minor bigint check (goal_minor is null or goal_minor >= 0),
  currency text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  starts_at timestamptz,
  ends_at timestamptz,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);

create index if not exists fundraising_campaigns_org_idx
  on app.fundraising_campaigns(organization_id, created_at desc);

-- -----------------------------------------------------------------------------
-- Audit log
-- -----------------------------------------------------------------------------
create table if not exists app.audit_log (
  id bigint generated always as identity primary key,
  occurred_at timestamptz not null default now(),
  actor_user_id uuid references auth.users(id) on delete set null,
  organization_id uuid references app.organizations(id) on delete set null,
  action text not null,
  entity_type text,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists audit_log_org_time_idx
  on app.audit_log(organization_id, occurred_at desc);
create index if not exists audit_log_actor_time_idx
  on app.audit_log(actor_user_id, occurred_at desc);

-- -----------------------------------------------------------------------------
-- Updated-at triggers
-- -----------------------------------------------------------------------------
drop trigger if exists profiles_set_updated_at on app.profiles;
create trigger profiles_set_updated_at before update on app.profiles
for each row execute function app.set_updated_at();

drop trigger if exists organizations_set_updated_at on app.organizations;
create trigger organizations_set_updated_at before update on app.organizations
for each row execute function app.set_updated_at();

drop trigger if exists organization_members_set_updated_at on app.organization_members;
create trigger organization_members_set_updated_at before update on app.organization_members
for each row execute function app.set_updated_at();

drop trigger if exists plans_set_updated_at on app.subscription_plans;
create trigger plans_set_updated_at before update on app.subscription_plans
for each row execute function app.set_updated_at();

drop trigger if exists subscriptions_set_updated_at on app.organization_subscriptions;
create trigger subscriptions_set_updated_at before update on app.organization_subscriptions
for each row execute function app.set_updated_at();

drop trigger if exists campaigns_set_updated_at on app.fundraising_campaigns;
create trigger campaigns_set_updated_at before update on app.fundraising_campaigns
for each row execute function app.set_updated_at();

-- -----------------------------------------------------------------------------
-- Security helpers — layered authorization kernel.
--
-- Layer rules (invariant: acyclic by construction):
--   Primitives  = flat fact lookups. One statement, no calls to other helpers.
--   Composites  = boolean arithmetic over primitives. No direct table access.
--   Policies and api.* may reference both layers; nothing references upward.
-- All are SECURITY DEFINER (run as table owner) so RLS never re-enters here.
-- -----------------------------------------------------------------------------
create or replace function security.is_system_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from app.system_admins sa
    where sa.user_id = auth.uid()
  );
$$;

-- Membership + context primitive. Resolves coalesce(p_org_id, active org)
-- and returns the caller's role and that organization's status.
-- Zero rows when not a member or when there is no resolvable organization.
create or replace function security.has_role_in_active_org(p_org_id uuid default null)
returns table (organization_id uuid, member_role app.organization_role, org_status app.organization_status)
language sql
stable
security definer
set search_path = ''
as $$
  select om.organization_id, om.role, o.status
  from app.organization_members om
  join app.organizations o on o.id = om.organization_id
  where om.user_id = auth.uid()
    and om.organization_id = coalesce(
      p_org_id,
      (
        select pr.active_organization_id
        from app.profiles pr
        where pr.id = auth.uid()
      )
    );
$$;

-- Catalog primitive: what scope and feature a permission code requires.
create or replace function security.permission_meta(p_permission text)
returns table (perm_scope app.permission_scope, feature_code text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.scope, f.code
  from app.permissions p
  left join app.features f on f.id = p.feature_id
  where p.code = p_permission;
$$;

create or replace function security.has_explicit_permission(p_org_id uuid, p_permission text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from app.organization_member_permissions omp
    join app.permissions p on p.id = omp.permission_id
    where omp.organization_id = p_org_id
      and omp.user_id = auth.uid()
      and p.code = p_permission
      and p.scope = 'organization'
  );
$$;

create or replace function security.has_feature(p_org_id uuid, p_feature text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from app.organization_subscriptions os
    join app.plan_features pf on pf.plan_id = os.plan_id
    join app.features f on f.id = pf.feature_id
    where os.organization_id = p_org_id
      and os.status in ('trialing', 'active', 'past_due')
      and os.starts_at <= now()
      and (os.ends_at is null or os.ends_at > now())
      and f.code = p_feature
  );
$$;

-- Composites: pure logic over the primitives above.

create or replace function security.is_org_member(p_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from security.has_role_in_active_org(p_org_id) h
    where h.org_status <> 'rejected'
  );
$$;

create or replace function security.is_org_admin(p_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from security.has_role_in_active_org(p_org_id) h
    where h.member_role = 'admin'
      and h.org_status <> 'rejected'
  );
$$;

-- Central authorization policy engine.
-- If p_org_id is NULL, the user's active organization is used.
create or replace function security.can_perform(
  p_permission text,
  p_org_id uuid default null
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  m record;
  v_org_id uuid;
  v_role app.organization_role;
  v_status app.organization_status;
begin
  if v_user_id is null then
    return false;
  end if;

  select * into m from security.permission_meta(p_permission);

  if m.perm_scope is null then
    return false;
  end if;

  if m.perm_scope = 'system' then
    return security.is_system_admin();
  end if;

  select h.organization_id, h.member_role, h.org_status
    into v_org_id, v_role, v_status
  from security.has_role_in_active_org(p_org_id) h;

  if not found then
    return false;
  end if;

  -- Pending organizations are only manageable through the explicit
  -- organization approval workflow. Suspended organizations are read-only
  -- through the limited API surface.
  if v_status <> 'active' then
    return false;
  end if;

  -- Organization admins have all organization-scoped permissions, but do
  -- not bypass subscription feature entitlements.
  if v_role <> 'admin' and not security.has_explicit_permission(v_org_id, p_permission) then
    return false;
  end if;

  if m.feature_code is not null and not security.has_feature(v_org_id, m.feature_code) then
    return false;
  end if;

  return true;
end;
$$;

-- -----------------------------------------------------------------------------
-- API: profile self-management
create or replace function api.update_my_profile(
  p_display_name text default null,
  p_avatar_url text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_name text := nullif(trim(p_display_name), '');
  v_result jsonb;
begin
  if v_user_id is null then
    raise exception using errcode = '28000', message = 'Not authenticated';
  end if;

  if v_name is not null and length(v_name) > 100 then
    raise exception using errcode = '22023', message = 'Display name too long (max 100)';
  end if;

  if p_avatar_url is not null
     and p_avatar_url !~* '^https?://[^\s]+$' then
    raise exception using errcode = '22023', message = 'Avatar URL must be an http(s) URL';
  end if;

  update app.profiles
  set display_name = coalesce(v_name, display_name),
      avatar_url   = coalesce(p_avatar_url, avatar_url)
  where id = v_user_id;

  if not found then
    raise exception using errcode = '22023', message = 'Profile not found';
  end if;

  insert into app.audit_log(actor_user_id, action, entity_type, entity_id)
  values (v_user_id, 'profile.updated', 'user', v_user_id);

  select jsonb_build_object(
    'id', pr.id,
    'display_name', pr.display_name,
    'avatar_url', pr.avatar_url,
    'active_organization_id', pr.active_organization_id
  ) into v_result
  from app.profiles pr where pr.id = v_user_id;

  return v_result;
end;
$$;

-- -----------------------------------------------------------------------------
-- API: session / organization context
-- -----------------------------------------------------------------------------
create or replace function api.get_session_context()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_active uuid;
  v_active_valid boolean := false;
  v_orgs jsonb;
begin
  if v_user_id is null then
    raise exception using errcode = '28000', message = 'Not authenticated';
  end if;

  select p.active_organization_id into v_active
  from app.profiles p where p.id = v_user_id;

  if v_active is not null then
    select exists (
      select 1
      from app.organization_members om
      join app.organizations o on o.id = om.organization_id
      where om.organization_id = v_active
        and om.user_id = v_user_id
        and o.status <> 'rejected'
    ) into v_active_valid;
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', o.id,
      'name', o.name,
      'slug', o.slug,
      'status', o.status,
      'role', om.role,
      'is_active_selection', (o.id = v_active)
    ) order by o.name
  ), '[]'::jsonb)
  into v_orgs
  from app.organization_members om
  join app.organizations o on o.id = om.organization_id
  where om.user_id = v_user_id;

  return jsonb_build_object(
    'user_id', v_user_id,
    'display_name', coalesce((
      select pr.display_name from app.profiles pr where pr.id = v_user_id
    ), ''),
    'is_system_admin', security.is_system_admin(),
    'active_organization_id', case when v_active_valid then v_active else null end,
    'organizations', v_orgs
  );
end;
$$;

create or replace function api.set_active_organization(p_org_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception using errcode = '28000', message = 'Not authenticated';
  end if;

  if not security.is_org_member(p_org_id) then
    raise exception using errcode = '42501', message = 'You are not a member of this organization';
  end if;

  update app.profiles
  set active_organization_id = p_org_id
  where id = auth.uid();

  return jsonb_build_object('active_organization_id', p_org_id);
end;
$$;

create or replace function api.get_my_organizations()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', o.id,
      'name', o.name,
      'slug', o.slug,
      'status', o.status,
      'role', om.role
    ) order by o.name
  ), '[]'::jsonb)
  from app.organization_members om
  join app.organizations o on o.id = om.organization_id
  where om.user_id = auth.uid();
$$;

-- -----------------------------------------------------------------------------
-- API: organization signup / administration
-- -----------------------------------------------------------------------------
create or replace function api.request_organization(p_name text, p_slug text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org_id uuid;
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception using errcode = '28000', message = 'Not authenticated';
  end if;

  if length(trim(p_name)) not between 1 and 200 then
    raise exception using errcode = '22023', message = 'Invalid organization name';
  end if;

  insert into app.organizations(name, slug, status, created_by)
  values (trim(p_name), lower(trim(p_slug)), 'pending', v_user_id)
  returning id into v_org_id;

  insert into app.organization_members(organization_id, user_id, role)
  values (v_org_id, v_user_id, 'admin');

  insert into app.audit_log(actor_user_id, organization_id, action, entity_type, entity_id)
  values (v_user_id, v_org_id, 'organization.requested', 'organization', v_org_id);

  return v_org_id;
exception when unique_violation then
  raise exception using errcode = '23505', message = 'Organization slug already exists';
end;
$$;

create or replace function api.approve_organization(p_org_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not security.can_perform('system.organizations.approve') then
    raise exception using errcode = '42501', message = 'Not authorized';
  end if;

  update app.organizations
  set status = 'active', approved_by = auth.uid(), approved_at = now()
  where id = p_org_id and status = 'pending';

  if not found then
    raise exception using errcode = '22023', message = 'Organization is not pending';
  end if;

  insert into app.audit_log(actor_user_id, organization_id, action, entity_type, entity_id)
  values (auth.uid(), p_org_id, 'organization.approved', 'organization', p_org_id);
end;
$$;

create or replace function api.reject_organization(p_org_id uuid, p_note text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not security.can_perform('system.organizations.reject') then
    raise exception using errcode = '42501', message = 'Not authorized';
  end if;

  update app.organizations
  set status = 'rejected', suspension_note = null
  where id = p_org_id and status = 'pending';

  if not found then
    raise exception using errcode = '22023', message = 'Organization is not pending';
  end if;

  insert into app.audit_log(actor_user_id, organization_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), p_org_id, 'organization.rejected', 'organization', p_org_id,
          jsonb_build_object('note', p_note));
end;
$$;

create or replace function api.suspend_organization(p_org_id uuid, p_note text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not security.can_perform('system.organizations.suspend') then
    raise exception using errcode = '42501', message = 'Not authorized';
  end if;

  if p_note is null or length(trim(p_note)) = 0 then
    raise exception using errcode = '22023', message = 'Suspension note is required';
  end if;

  update app.organizations
  set status = 'suspended', suspended_by = auth.uid(), suspended_at = now(), suspension_note = trim(p_note)
  where id = p_org_id and status <> 'rejected';

  if not found then
    raise exception using errcode = '22023', message = 'Organization not found';
  end if;

  insert into app.audit_log(actor_user_id, organization_id, action, entity_type, entity_id)
  values (auth.uid(), p_org_id, 'organization.suspended', 'organization', p_org_id);
end;
$$;

create or replace function api.unsuspend_organization(p_org_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not security.can_perform('system.organizations.unsuspend') then
    raise exception using errcode = '42501', message = 'Not authorized';
  end if;

  update app.organizations
  set status = 'active', suspended_by = null, suspended_at = null, suspension_note = null,
      approved_by = coalesce(approved_by, auth.uid()), approved_at = coalesce(approved_at, now())
  where id = p_org_id and status = 'suspended';

  if not found then
    raise exception using errcode = '22023', message = 'Organization is not suspended';
  end if;

  insert into app.audit_log(actor_user_id, organization_id, action, entity_type, entity_id)
  values (auth.uid(), p_org_id, 'organization.unsuspended', 'organization', p_org_id);
end;
$$;

create or replace function api.get_organization_status(p_org_id uuid default null)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', o.id,
    'name', o.name,
    'status', o.status,
    'suspension_note', case when o.status = 'suspended' then o.suspension_note else null end
  )
  from app.organizations o
  join security.has_role_in_active_org(p_org_id) h on h.organization_id = o.id
  where h.org_status <> 'rejected';
$$;

-- -----------------------------------------------------------------------------
-- API: invitations / membership
-- -----------------------------------------------------------------------------
create or replace function api.invite_member(
  p_email text,
  p_role app.organization_role default 'member',
  p_org_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org_id uuid := coalesce(p_org_id, (select pr.active_organization_id from app.profiles pr where pr.id = auth.uid()));
  v_invitation_id uuid;
  v_token text;
  v_hash text;
  v_email text := lower(trim(p_email));
begin
  if not security.can_perform('organization.members.invite', v_org_id) then
    raise exception using errcode = '42501', message = 'Not authorized';
  end if;

  if v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception using errcode = '22023', message = 'Invalid email address';
  end if;

  if p_role not in ('admin', 'member') then
    raise exception using errcode = '22023', message = 'Invalid role';
  end if;

  if exists (
    select 1 from app.organization_members om
    join auth.users u on u.id = om.user_id
    where om.organization_id = v_org_id
      and lower(u.email) = v_email
  ) then
    raise exception using errcode = '23505', message = 'User is already a member';
  end if;

  v_token := security.random_token_hex();
  v_hash := security.token_digest(v_token);

  insert into app.organization_invitations(
    organization_id, email, role, token_hash, invited_by, expires_at
  )
  values (
    v_org_id, v_email, p_role, v_hash, auth.uid(), now() + interval '7 days'
  )
  returning id into v_invitation_id;

  insert into app.audit_log(actor_user_id, organization_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), v_org_id, 'organization.member_invited', 'invitation', v_invitation_id,
          jsonb_build_object('email', v_email, 'role', p_role));

  return jsonb_build_object(
    'invitation_id', v_invitation_id,
    'token', v_token,
    'expires_at', now() + interval '7 days'
  );
exception when unique_violation then
  raise exception using errcode = '23505', message = 'A pending invitation already exists for this email';
end;
$$;

create or replace function api.accept_invitation(p_token text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_hash text := security.token_digest(p_token);
  v_inv app.organization_invitations%rowtype;
  v_user_email text;
  v_org_id uuid;
begin
  if v_user_id is null then
    raise exception using errcode = '28000', message = 'Not authenticated';
  end if;

  select * into v_inv
  from app.organization_invitations i
  where i.token_hash = v_hash
  for update;

  if not found then
    raise exception using errcode = '22023', message = 'INV01: Invitation not found';
  end if;

  if v_inv.status <> 'pending' or v_inv.expires_at <= now() then
    raise exception using errcode = '22023', message = 'INV02: Invitation expired or already used';
  end if;

  select lower(email) into v_user_email from auth.users where id = v_user_id;

  if v_user_email is null or v_user_email <> v_inv.email then
    raise exception using errcode = '42501', message = 'INV03: Invitation email does not match authenticated user';
  end if;

  insert into app.organization_members(organization_id, user_id, role)
  values (v_inv.organization_id, v_user_id, v_inv.role)
  on conflict (organization_id, user_id) do update set role = excluded.role;

  update app.organization_invitations
  set status = 'accepted', accepted_by = v_user_id, accepted_at = now()
  where id = v_inv.id;

  v_org_id := v_inv.organization_id;

  insert into app.audit_log(actor_user_id, organization_id, action, entity_type, entity_id)
  values (v_user_id, v_org_id, 'organization.invitation_accepted', 'invitation', v_inv.id);

  update app.profiles
  set active_organization_id = v_org_id
  where id = v_user_id;

  return v_org_id;
end;
$$;

create or replace function api.revoke_invitation(p_invitation_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org_id uuid;
begin
  select organization_id into v_org_id
  from app.organization_invitations
  where id = p_invitation_id;

  if v_org_id is null or not security.can_perform('organization.members.invite', v_org_id) then
    raise exception using errcode = '42501', message = 'Not authorized';
  end if;

  update app.organization_invitations
  set status = 'revoked', revoked_at = now()
  where id = p_invitation_id and status = 'pending';
end;
$$;

create or replace function api.change_member_role(
  p_user_id uuid,
  p_role app.organization_role,
  p_org_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org_id uuid := coalesce(p_org_id, (select pr.active_organization_id from app.profiles pr where pr.id = auth.uid()));
  v_member_role app.organization_role;
begin
  if not security.can_perform('organization.members.change_role', v_org_id) then
    raise exception using errcode = '42501', message = 'Not authorized';
  end if;

  -- Serialize membership mutations per org: without this, two concurrent
  -- demotions can each observe count=2 and jointly reach zero admins
  -- (READ COMMITTED snapshots do not see each other's uncommitted rows).
  perform pg_advisory_xact_lock(hashtext(v_org_id::text));

  if p_user_id = auth.uid() then
    raise exception using errcode = '22023', message = 'You cannot change your own role';
  end if;

  select role into v_member_role from app.organization_members
  where organization_id = v_org_id and user_id = p_user_id;

  if not found then
    raise exception using errcode = '22023', message = 'Member not found';
  end if;

  -- Demoting the last admin must fail. The count predicate is evaluated
  -- atomically inside this statement.
  update app.organization_members
  set role = p_role
  where organization_id = v_org_id
    and user_id = p_user_id
    and (
      p_role = 'admin'
      or v_member_role <> 'admin'
      or (
        select count(*) from app.organization_members oc
        where oc.organization_id = v_org_id and oc.role = 'admin'
      ) > 1
    );

  if not found then
    raise exception using errcode = '22023', message = 'Cannot demote the last organization admin';
  end if;

  insert into app.audit_log(actor_user_id, organization_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), v_org_id, 'organization.member_role_changed', 'user', p_user_id,
          jsonb_build_object('role', p_role));
end;
$$;

create or replace function api.remove_member(
  p_user_id uuid,
  p_org_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org_id uuid := coalesce(p_org_id, (select pr.active_organization_id from app.profiles pr where pr.id = auth.uid()));
  v_role app.organization_role;
begin
  if not security.can_perform('organization.members.remove', v_org_id) then
    raise exception using errcode = '42501', message = 'Not authorized';
  end if;

  -- Serialize membership mutations per org (see change_member_role).
  perform pg_advisory_xact_lock(hashtext(v_org_id::text));

  if p_user_id = auth.uid() then
    raise exception using errcode = '22023', message = 'You cannot remove yourself';
  end if;

  select role into v_role from app.organization_members
  where organization_id = v_org_id and user_id = p_user_id;

  if not found then
    raise exception using errcode = '22023', message = 'Member not found';
  end if;

  -- Removing the last admin must fail. The count predicate is evaluated
  -- atomically inside this statement.
  delete from app.organization_members
  where organization_id = v_org_id
    and user_id = p_user_id
    and (
      v_role <> 'admin'
      or (
        select count(*) from app.organization_members oc
        where oc.organization_id = v_org_id and oc.role = 'admin'
      ) > 1
    );

  if not found then
    raise exception using errcode = '22023', message = 'Organization must retain at least one admin';
  end if;

  insert into app.audit_log(actor_user_id, organization_id, action, entity_type, entity_id)
  values (auth.uid(), v_org_id, 'organization.member_removed', 'user', p_user_id);
end;
$$;

create or replace function api.set_member_permission(
  p_user_id uuid,
  p_permission text,
  p_granted boolean,
  p_org_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org_id uuid := coalesce(p_org_id, (select pr.active_organization_id from app.profiles pr where pr.id = auth.uid()));
  v_permission_id uuid;
begin
  if not security.can_perform('organization.members.permissions.manage', v_org_id) then
    raise exception using errcode = '42501', message = 'Not authorized';
  end if;

  select id into v_permission_id
  from app.permissions
  where code = p_permission and scope = 'organization';

  if v_permission_id is null then
    raise exception using errcode = '22023', message = 'Unknown organization permission';
  end if;

  if not exists (
    select 1 from app.organization_members
    where organization_id = v_org_id and user_id = p_user_id
  ) then
    raise exception using errcode = '22023', message = 'Member not found';
  end if;

  if p_granted then
    insert into app.organization_member_permissions(organization_id, user_id, permission_id)
    values (v_org_id, p_user_id, v_permission_id)
    on conflict do nothing;
  else
    delete from app.organization_member_permissions
    where organization_id = v_org_id
      and user_id = p_user_id
      and permission_id = v_permission_id;
  end if;
end;
$$;

create or replace function api.get_organization_members(p_org_id uuid default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_org_id uuid := coalesce(p_org_id, (select pr.active_organization_id from app.profiles pr where pr.id = auth.uid()));
  v_result jsonb;
begin
  if not security.is_org_member(v_org_id) then
    raise exception using errcode = '42501', message = 'Not authorized';
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'user_id', om.user_id,
      'email', u.email,
      'display_name', p.display_name,
      'role', om.role,
      'permissions', coalesce((
        select jsonb_agg(pm.code order by pm.code)
        from app.organization_member_permissions omp
        join app.permissions pm on pm.id = omp.permission_id
        where omp.organization_id = om.organization_id
          and omp.user_id = om.user_id
      ), '[]'::jsonb)
    ) order by om.created_at
  ), '[]'::jsonb)
  into v_result
  from app.organization_members om
  join auth.users u on u.id = om.user_id
  left join app.profiles p on p.id = om.user_id
  where om.organization_id = v_org_id;

  return v_result;
end;
$$;

-- -----------------------------------------------------------------------------
-- API: subscriptions / plans
-- -----------------------------------------------------------------------------
create or replace function api.get_current_subscription(p_org_id uuid default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_org_id uuid := coalesce(p_org_id, (select pr.active_organization_id from app.profiles pr where pr.id = auth.uid()));
  v_result jsonb;
begin
  if not security.is_org_member(v_org_id) then
    raise exception using errcode = '42501', message = 'Not authorized';
  end if;

  select jsonb_build_object(
    'id', os.id,
    'plan_id', sp.id,
    'plan_code', sp.code,
    'plan_name', sp.name,
    'status', os.status,
    'starts_at', os.starts_at,
    'ends_at', os.ends_at,
    'features', coalesce((
      select jsonb_agg(f.code order by f.code)
      from app.plan_features pf
      join app.features f on f.id = pf.feature_id
      where pf.plan_id = sp.id
    ), '[]'::jsonb)
  ) into v_result
  from app.organization_subscriptions os
  join app.subscription_plans sp on sp.id = os.plan_id
  where os.organization_id = v_org_id
    and os.status in ('trialing', 'active', 'past_due')
  order by os.starts_at desc
  limit 1;

  return coalesce(v_result, '{}'::jsonb);
end;
$$;

create or replace function api.create_plan(
  p_code text,
  p_name text,
  p_description text,
  p_price_minor bigint,
  p_currency text,
  p_billing_interval text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare v_id text;
begin
  if not security.can_perform('system.plans.manage') then
    raise exception using errcode = '42501', message = 'Not authorized';
  end if;
  insert into app.subscription_plans(code, name, description, price_minor, currency, billing_interval, created_by)
  values (lower(trim(p_code)), trim(p_name), p_description, p_price_minor, upper(p_currency), p_billing_interval, auth.uid())
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function api.set_plan_feature(p_plan_id text, p_feature_code text, p_enabled boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare v_feature_id text;
begin
  if not security.can_perform('system.plans.manage') then
    raise exception using errcode = '42501', message = 'Not authorized';
  end if;

  select id into v_feature_id from app.features where code = p_feature_code;
  if v_feature_id is null then
    raise exception using errcode = '22023', message = 'Feature not found';
  end if;

  if p_enabled then
    insert into app.plan_features(plan_id, feature_id)
    values (p_plan_id, v_feature_id)
    on conflict do nothing;
  else
    delete from app.plan_features
    where plan_id = p_plan_id and feature_id = v_feature_id;
  end if;
end;
$$;

create or replace function api.assign_subscription(
  p_org_id uuid,
  p_plan_id uuid,
  p_status app.subscription_status default 'active',
  p_starts_at timestamptz default now(),
  p_ends_at timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare v_id uuid;
begin
  -- Subscription lifecycle is system-administered only. Organization admins
  -- must never be able to self-assign plans (entitlement bypass).
  if not security.is_system_admin() then
    raise exception using errcode = '42501', message = 'Not authorized';
  end if;

  if not exists (select 1 from app.organizations where id = p_org_id and status = 'active') then
    raise exception using errcode = '22023', message = 'Organization is not active';
  end if;

  update app.organization_subscriptions
  set status = 'expired', ends_at = least(coalesce(ends_at, now()), now())
  where organization_id = p_org_id
    and status in ('trialing', 'active', 'past_due');

  insert into app.organization_subscriptions(organization_id, plan_id, status, starts_at, ends_at)
  values (p_org_id, p_plan_id, p_status, p_starts_at, p_ends_at)
  returning id into v_id;

  insert into app.audit_log(actor_user_id, organization_id, action, entity_type, entity_id)
  values (auth.uid(), p_org_id, 'subscription.assigned', 'subscription', v_id);

  return v_id;
end;
$$;

create or replace function api.deactivate_subscription(p_org_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if not security.is_system_admin() then
    raise exception using errcode = '42501', message = 'Not authorized';
  end if;

  update app.organization_subscriptions
  set status = 'canceled',
      ends_at = least(coalesce(ends_at, now()), now())
  where organization_id = p_org_id
    and status in ('trialing', 'active', 'past_due')
  returning id into v_id;

  if not found then
    raise exception using errcode = '22023', message = 'No active subscription for this organization';
  end if;

  insert into app.audit_log(actor_user_id, organization_id, action, entity_type, entity_id)
  values (auth.uid(), p_org_id, 'subscription.canceled', 'subscription', v_id);
end;
$$;

-- -----------------------------------------------------------------------------
-- API: system administration
-- bootstrap_system_admin is deliberately NOT executable by anon/authenticated:
-- the first platform admin is created through the ops path (service role or
-- psql with JWT claims set). grant/revoke are gated on is_system_admin().
-- -----------------------------------------------------------------------------
create or replace function api.bootstrap_system_admin()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception using errcode = '28000', message = 'Not authenticated';
  end if;

  -- Serialize the first-boot race.
  perform pg_advisory_xact_lock(hashtext('bootstrap_system_admin'));

  if exists (select 1 from app.system_admins sa where sa.user_id = auth.uid()) then
    return true;
  end if;

  if exists (select 1 from app.system_admins) then
    raise exception using errcode = '55006',
      message = 'System admin already exists. Use grant_system_admin instead.';
  end if;

  insert into app.system_admins(user_id) values (auth.uid());

  insert into app.audit_log(actor_user_id, action, entity_type, entity_id)
  values (auth.uid(), 'system_admin.bootstrapped', 'user', auth.uid());

  return true;
end;
$$;

create or replace function api.grant_system_admin(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not security.is_system_admin() then
    raise exception using errcode = '42501', message = 'Not authorized';
  end if;

  if not exists (select 1 from app.profiles pr where pr.id = p_user_id) then
    raise exception using errcode = '22023', message = 'User not found';
  end if;

  insert into app.system_admins(user_id) values (p_user_id)
  on conflict do nothing;

  insert into app.audit_log(actor_user_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), 'system_admin.granted', 'user', p_user_id,
          jsonb_build_object('grantee', p_user_id));
end;
$$;

create or replace function api.revoke_system_admin(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not security.is_system_admin() then
    raise exception using errcode = '42501', message = 'Not authorized';
  end if;

  -- The platform must always retain at least one system administrator.
  delete from app.system_admins sa
  where sa.user_id = p_user_id
    and (
      select count(*) from app.system_admins oc
    ) > 1;

  if not found then
    raise exception using errcode = '22023',
      message = 'Cannot revoke: target is not a system admin or is the last one';
  end if;

  insert into app.audit_log(actor_user_id, action, entity_type, entity_id)
  values (auth.uid(), 'system_admin.revoked', 'user', p_user_id);
end;
$$;

-- -----------------------------------------------------------------------------
-- -----------------------------------------------------------------------------
-- API: public surface (anon-reachable, key-whitelisted responses)
--
-- Two deliberate exposure points:
--   get_invitation_preview     — invite-link landing UX; the pending token is
--                                itself the credential.
--   list_public_organizations  — public directory of active+suspended orgs;
--                                aggregate counts only, never private columns
--                                or notes. Pending/rejected orgs invisible.
-- -----------------------------------------------------------------------------
create or replace function api.get_invitation_preview(p_token text)
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
    'org_name', o.name,
    'org_slug', o.slug,
    'role', i.role,
    'inviter_name', coalesce(pr.display_name, ''),
    'expires_at', i.expires_at
  ) into v_result
  from app.organization_invitations i
  join app.organizations o on o.id = i.organization_id
  left join app.profiles pr on pr.id = i.invited_by
  where i.token_hash = security.token_digest(p_token)
    and i.status = 'pending'
    and i.expires_at > now();

  if v_result is null then
    if exists (
      select 1 from app.organization_invitations
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

create or replace function api.list_public_organizations(p_limit int default 50)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'name', x.name,
      'slug', x.slug,
      'status', x.status,
      'member_count', x.member_count,
      'campaign_count', x.campaign_count,
      'created_at', x.created_at
    ) order by x.name), '[]'::jsonb)
  from (
    select o.name, o.slug, o.status, o.created_at,
      (select count(*) from app.organization_members m
        where m.organization_id = o.id)::int as member_count,
      (select count(*) from app.fundraising_campaigns c
        where c.organization_id = o.id)::int as campaign_count
    from app.organizations o
    where o.status in ('active', 'suspended')
    limit least(greatest(coalesce(p_limit, 50), 1), 200)
  ) x;
$$;

-- Sysadmin listings backing the admin console.
create or replace function api.list_all_organizations(p_limit int default 200)
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
      'id', o.id, 'name', o.name, 'slug', o.slug, 'status', o.status,
      'suspension_note', case when o.status='suspended' then o.suspension_note end,
      'created_at', o.created_at
    ) order by o.created_at desc)
    from (
      select * from app.organizations
      order by created_at desc
      limit least(greatest(coalesce(p_limit,200),1),500)
    ) o
  ), '[]'::jsonb);
end;
$$;

-- Sysadmin-only: resolve a user id from email (admin management UI).
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

  return v_user_id; -- null when no such user
end;
$$;
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
    ) order by sp.price_minor, sp.name)
    from app.subscription_plans sp
  ), '[]'::jsonb);
end;
$$;

-- -----------------------------------------------------------------------------
-- API: fundraising campaigns
-- -----------------------------------------------------------------------------
create or replace function api.list_campaigns(p_org_id uuid default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_org_id uuid := coalesce(p_org_id, (select pr.active_organization_id from app.profiles pr where pr.id = auth.uid()));
  v_result jsonb;
begin
  if not security.can_perform('fundraising.view', v_org_id) then
    raise exception using errcode = '42501', message = 'Not authorized';
  end if;

  select coalesce(jsonb_agg(to_jsonb(c) order by c.created_at desc), '[]'::jsonb)
  into v_result
  from app.fundraising_campaigns c
  where c.organization_id = v_org_id;

  return v_result;
end;
$$;

create or replace function api.create_campaign(
  p_name text,
  p_description text default null,
  p_goal_minor bigint default null,
  p_currency text default 'USD',
  p_starts_at timestamptz default null,
  p_ends_at timestamptz default null,
  p_org_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org_id uuid := coalesce(p_org_id, (select pr.active_organization_id from app.profiles pr where pr.id = auth.uid()));
  v_id uuid;
begin
  if not security.can_perform('fundraising.create', v_org_id) then
    raise exception using errcode = '42501', message = 'Not authorized';
  end if;

  insert into app.fundraising_campaigns(
    organization_id, name, description, goal_minor, currency, starts_at, ends_at, created_by
  )
  values (
    v_org_id, trim(p_name), p_description, p_goal_minor, upper(p_currency), p_starts_at, p_ends_at, auth.uid()
  )
  returning id into v_id;

  insert into app.audit_log(actor_user_id, organization_id, action, entity_type, entity_id)
  values (auth.uid(), v_org_id, 'fundraising.campaign_created', 'fundraising_campaign', v_id);

  return v_id;
end;
$$;

create or replace function api.update_campaign(
  p_campaign_id uuid,
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
  v_org_id uuid;
begin
  select organization_id into v_org_id
  from app.fundraising_campaigns
  where id = p_campaign_id;

  if v_org_id is null or not security.can_perform('fundraising.update', v_org_id) then
    raise exception using errcode = '42501', message = 'Not authorized';
  end if;

  update app.fundraising_campaigns
  set name = coalesce(trim(p_name), name),
      description = coalesce(p_description, description),
      goal_minor = coalesce(p_goal_minor, goal_minor),
      currency = coalesce(upper(p_currency), currency),
      starts_at = coalesce(p_starts_at, starts_at),
      ends_at = coalesce(p_ends_at, ends_at)
  where id = p_campaign_id;
end;
$$;

create or replace function api.delete_campaign(p_campaign_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare v_org_id uuid;
begin
  select organization_id into v_org_id from app.fundraising_campaigns where id = p_campaign_id;
  if v_org_id is null or not security.can_perform('fundraising.delete', v_org_id) then
    raise exception using errcode = '42501', message = 'Not authorized';
  end if;
  delete from app.fundraising_campaigns where id = p_campaign_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- Seed features and permissions
-- -----------------------------------------------------------------------------
insert into app.features(code, name, description) values
  ('fundraising', 'Fundraising', 'Fundraising campaign management')
on conflict (code) do nothing;

insert into app.permissions(code, name, description, scope, feature_id)
select x.code, x.name, x.description, 'organization', f.id
from (values
  ('fundraising.view', 'View fundraising', 'View fundraising campaigns'),
  ('fundraising.create', 'Create fundraising', 'Create fundraising campaigns'),
  ('fundraising.update', 'Update fundraising', 'Update fundraising campaigns'),
  ('fundraising.delete', 'Delete fundraising', 'Delete fundraising campaigns'),
  ('fundraising.manage', 'Manage fundraising', 'Full fundraising management')
) x(code, name, description)
join app.features f on f.code = 'fundraising'
on conflict (code) do nothing;

insert into app.permissions(code, name, description, scope) values
  ('organization.members.invite', 'Invite members', 'Invite organization members', 'organization'),
  ('organization.members.change_role', 'Change member role', 'Promote or demote organization members', 'organization'),
  ('organization.members.remove', 'Remove members', 'Remove organization members', 'organization'),
  ('organization.members.permissions.manage', 'Manage member permissions', 'Grant or revoke organization permissions', 'organization'),
  ('system.organizations.approve', 'Approve organizations', 'Approve pending organizations', 'system'),
  ('system.organizations.reject', 'Reject organizations', 'Reject pending organizations', 'system'),
  ('system.organizations.suspend', 'Suspend organizations', 'Suspend organizations', 'system'),
  ('system.organizations.unsuspend', 'Unsuspend organizations', 'Unsuspend organizations', 'system'),
  ('system.plans.manage', 'Manage subscription plans', 'Create and manage subscription plans', 'system')
on conflict (code) do nothing;

-- Example basic plan. Features are explicitly assigned to plans.
insert into app.subscription_plans(code, name, description, price_minor, currency, billing_interval)
values ('basic', 'Basic', 'Basic subscription plan', 0, 'USD', 'month')
on conflict (code) do nothing;

insert into app.plan_features(plan_id, feature_id)
select sp.id, f.id
from app.subscription_plans sp
cross join app.features f
where sp.code = 'basic' and f.code = 'fundraising'
on conflict do nothing;

-- -----------------------------------------------------------------------------
-- RLS: tables are never directly exposed as the application API.
-- RLS is defense-in-depth and primarily enforces tenant isolation.
--
-- INVARIANT: table privileges are fully revoked from anon/authenticated and
-- every api.* function is SECURITY DEFINER (runs as table owner, which
-- bypasses RLS). Policies therefore never evaluate in normal traffic. If you
-- ever grant selective table access back to authenticated, policies activate —
-- keep EXECUTE on security.is_system_admin/is_org_member/is_org_admin granted
-- to authenticated (below) or every query will fail with permission denied.
-- -----------------------------------------------------------------------------
alter table app.profiles enable row level security;
alter table app.organizations enable row level security;
alter table app.organization_members enable row level security;
alter table app.system_admins enable row level security;
alter table app.features enable row level security;
alter table app.permissions enable row level security;
alter table app.organization_member_permissions enable row level security;
alter table app.organization_invitations enable row level security;
alter table app.subscription_plans enable row level security;
alter table app.plan_features enable row level security;
alter table app.organization_subscriptions enable row level security;
alter table app.fundraising_campaigns enable row level security;
alter table app.audit_log enable row level security;

-- No direct table privileges for frontend roles.
revoke all on all tables in schema app from anon, authenticated;
revoke all on all sequences in schema app from anon, authenticated;
revoke all on all functions in schema app from anon, authenticated;
-- Seals the security kernel AND the pgcrypto primitives relocated there.
-- PUBLIC is revoked too: new functions default to EXECUTE-for-PUBLIC, so
-- omitting it would leave every helper reachable until individually named.
revoke all on all functions in schema security from public, anon, authenticated;
alter default privileges in schema security
  revoke execute on functions from public;

-- Explicit grant surface only. No schema-wide grant: new api functions stay
-- unreachable until deliberately listed here.

-- Profiles: only own profile through direct table access (normally not used by frontend).
drop policy if exists profiles_self_select on app.profiles;
create policy profiles_self_select on app.profiles
for select to authenticated
using (id = auth.uid());

drop policy if exists profiles_self_update on app.profiles;
create policy profiles_self_update on app.profiles
for update to authenticated
using (id = auth.uid())
with check (id = auth.uid());

-- Organizations: members can see their organization; system admins can see all.
drop policy if exists organizations_select on app.organizations;
create policy organizations_select on app.organizations
for select to authenticated
using (security.is_system_admin() or security.is_org_member(id));

-- Organization members: members can see members of their org.
drop policy if exists organization_members_select on app.organization_members;
create policy organization_members_select on app.organization_members
for select to authenticated
using (security.is_system_admin() or security.is_org_member(organization_id));

-- Permission assignments: members can read assignments within their org.
drop policy if exists member_permissions_select on app.organization_member_permissions;
create policy member_permissions_select on app.organization_member_permissions
for select to authenticated
using (security.is_system_admin() or security.is_org_member(organization_id));

-- Invitations: admins of the org and system admins can inspect invitations.
drop policy if exists invitations_select on app.organization_invitations;
create policy invitations_select on app.organization_invitations
for select to authenticated
using (security.is_system_admin() or security.is_org_admin(organization_id));

-- Plans/features are catalog data. Keep them inaccessible directly; APIs expose them.
drop policy if exists no_direct_plan_select on app.subscription_plans;
create policy no_direct_plan_select on app.subscription_plans
for select to authenticated
using (false);

drop policy if exists no_direct_features_select on app.features;
create policy no_direct_features_select on app.features
for select to authenticated
using (false);

drop policy if exists no_direct_permissions_select on app.permissions;
create policy no_direct_permissions_select on app.permissions
for select to authenticated
using (false);

drop policy if exists no_direct_plan_features_select on app.plan_features;
create policy no_direct_plan_features_select on app.plan_features
for select to authenticated
using (false);

-- Subscriptions: members can see their organization's subscription.
drop policy if exists subscriptions_select on app.organization_subscriptions;
create policy subscriptions_select on app.organization_subscriptions
for select to authenticated
using (security.is_system_admin() or security.is_org_member(organization_id));

-- Fundraising: tenant isolation only at RLS layer. Business permission is API-layer.
drop policy if exists campaigns_select on app.fundraising_campaigns;
create policy campaigns_select on app.fundraising_campaigns
for select to authenticated
using (security.is_system_admin() or security.is_org_member(organization_id));

drop policy if exists campaigns_insert on app.fundraising_campaigns;
create policy campaigns_insert on app.fundraising_campaigns
for insert to authenticated
with check (security.is_system_admin() or security.is_org_member(organization_id));

drop policy if exists campaigns_update on app.fundraising_campaigns;
create policy campaigns_update on app.fundraising_campaigns
for update to authenticated
using (security.is_system_admin() or security.is_org_member(organization_id))
with check (security.is_system_admin() or security.is_org_member(organization_id));

drop policy if exists campaigns_delete on app.fundraising_campaigns;
create policy campaigns_delete on app.fundraising_campaigns
for delete to authenticated
using (security.is_system_admin() or security.is_org_member(organization_id));

-- System admin table: never directly visible to frontend.
drop policy if exists no_system_admin_select on app.system_admins;
create policy no_system_admin_select on app.system_admins
for select to authenticated
using (false);

-- Audit log: inaccessible directly; expose only through purpose-built APIs later.
drop policy if exists no_audit_select on app.audit_log;
create policy no_audit_select on app.audit_log
for select to authenticated
using (false);

-- -----------------------------------------------------------------------------
-- Lock down function execution explicitly.
--
-- Policy-referenced helpers and client-facing decision helpers get EXECUTE for
-- authenticated (policies evaluate as the querying user). Primitives stay
-- sealed; api.* calls them under the definer's privileges.
-- USAGE on the schema itself is required to resolve any of these names.
grant usage on schema security to authenticated;
-- -----------------------------------------------------------------------------
revoke execute on function security.has_role_in_active_org(uuid) from public, anon, authenticated;
revoke execute on function security.permission_meta(text) from public, anon, authenticated;
revoke execute on function security.has_explicit_permission(uuid, text) from public, anon, authenticated;

grant execute on function security.is_system_admin() to authenticated;
grant execute on function security.is_org_member(uuid) to authenticated;
grant execute on function security.is_org_admin(uuid) to authenticated;
grant execute on function security.can_perform(text, uuid) to authenticated;
grant execute on function security.has_feature(uuid, text) to authenticated;

-- bootstrap_system_admin: ops-only. service_role keeps the default PUBLIC
-- execute after the revokes below; anon/authenticated must never reach it.
revoke execute on function api.bootstrap_system_admin() from public, anon, authenticated;
grant execute on function api.bootstrap_system_admin() to service_role;

-- Explicit api grant surface.
grant execute on function api.update_my_profile(text, text) to authenticated;

-- USAGE on app is required by PostgREST to resolve argument types
-- (e.g. app.subscription_status) in json_to_record under the calling role.
-- Table/object privileges above remain fully revoked, so this exposes
-- catalog names only.
grant usage on schema app to anon, authenticated;

-- Public surface: the only functions anon may ever reach.
grant execute on function api.get_invitation_preview(text) to anon, authenticated;
grant execute on function api.list_public_organizations(int) to anon, authenticated;

grant execute on function api.find_user_id_by_email(text) to authenticated;
grant execute on function api.list_all_organizations(int) to authenticated;
grant execute on function api.list_plans() to authenticated;
grant execute on function api.get_session_context() to authenticated;
grant execute on function api.set_active_organization(uuid) to authenticated;
grant execute on function api.get_my_organizations() to authenticated;
grant execute on function api.request_organization(text, text) to authenticated;
grant execute on function api.approve_organization(uuid) to authenticated;
grant execute on function api.reject_organization(uuid, text) to authenticated;
grant execute on function api.suspend_organization(uuid, text) to authenticated;
grant execute on function api.unsuspend_organization(uuid) to authenticated;
grant execute on function api.get_organization_status(uuid) to authenticated;
grant execute on function api.invite_member(text, app.organization_role, uuid) to authenticated;
grant execute on function api.accept_invitation(text) to authenticated;
grant execute on function api.revoke_invitation(uuid) to authenticated;
grant execute on function api.change_member_role(uuid, app.organization_role, uuid) to authenticated;
grant execute on function api.remove_member(uuid, uuid) to authenticated;
grant execute on function api.set_member_permission(uuid, text, boolean, uuid) to authenticated;
grant execute on function api.get_organization_members(uuid) to authenticated;
grant execute on function api.get_current_subscription(uuid) to authenticated;
grant execute on function api.create_plan(text, text, text, bigint, text, text) to authenticated;
grant execute on function api.set_plan_feature(uuid, text, boolean) to authenticated;
grant execute on function api.assign_subscription(uuid, uuid, app.subscription_status, timestamptz, timestamptz) to authenticated;
grant execute on function api.deactivate_subscription(uuid) to authenticated;
grant execute on function api.grant_system_admin(uuid) to authenticated;
grant execute on function api.revoke_system_admin(uuid) to authenticated;
grant execute on function api.list_campaigns(uuid) to authenticated;
grant execute on function api.create_campaign(text, text, bigint, text, timestamptz, timestamptz, uuid) to authenticated;
grant execute on function api.update_campaign(uuid, text, text, bigint, text, timestamptz, timestamptz) to authenticated;
grant execute on function api.delete_campaign(uuid) to authenticated;

commit;
