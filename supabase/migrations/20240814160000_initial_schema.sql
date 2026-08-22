-- ====================================================================
-- SupaNext: Consolidated Migration
-- ====================================================================
-- Function-first architecture:
-- 1. All operations through PostgreSQL functions (no direct table access)
-- 2. Restrictive RLS (deny all by default, selective policies)
-- 3. Business logic encapsulated in database functions
-- 4. SECURITY INVOKER on utility functions (run as auth user)
-- 5. SECURITY DEFINER only on triggers, CLI helpers, and anon-access fns
-- ====================================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ====================================================================
-- TABLES
-- ====================================================================

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  metadata JSONB DEFAULT '{}',
  is_system_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  description TEXT,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  status TEXT NOT NULL DEFAULT 'active',
  is_owner BOOLEAN NOT NULL DEFAULT false,
  invited_by UUID REFERENCES profiles(id),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  is_system_role BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role TEXT NOT NULL REFERENCES roles(name) ON DELETE CASCADE,
  permission TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(role, permission)
);

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id UUID,
  metadata JSONB DEFAULT '{}',
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE todos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  completed BOOLEAN DEFAULT false,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  role TEXT DEFAULT 'member',
  invited_by UUID REFERENCES profiles(id),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================================================
-- INDEXES
-- ====================================================================

CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_full_name ON profiles(full_name);
CREATE INDEX idx_organizations_slug ON organizations(slug);
CREATE INDEX idx_organization_members_org_id ON organization_members(organization_id);
CREATE INDEX idx_organization_members_user_id ON organization_members(user_id);
CREATE INDEX idx_organization_members_status ON organization_members(status);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_org_id ON audit_logs(organization_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_todos_organization_id ON todos(organization_id);
CREATE INDEX idx_todos_created_by ON todos(created_by);
CREATE INDEX idx_invites_organization_id ON invites(organization_id);
CREATE INDEX idx_invites_email ON invites(email);
CREATE INDEX idx_invites_token ON invites(token);
CREATE INDEX idx_role_permissions_role ON role_permissions(role);
CREATE INDEX idx_role_permissions_permission ON role_permissions(permission);

-- ====================================================================
-- HELPER FUNCTIONS (must exist before RLS policies reference them)
-- ====================================================================

-- can_perform: core RBAC check. INVOKER — subject to RLS.
CREATE OR REPLACE FUNCTION can_perform(permission_name TEXT, p_org_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.organization_id = p_org_id
      AND om.user_id = auth.uid()
      AND om.status = 'active'
      AND om.is_owner = true
  ) OR EXISTS (
    SELECT 1 FROM organization_members om
    JOIN role_permissions rp ON rp.role = om.role
    WHERE om.organization_id = p_org_id
      AND om.user_id = auth.uid()
      AND om.status = 'active'
      AND (rp.permission = permission_name OR rp.permission = '*')
  );
$$ LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public;

-- is_system_admin: checks profile flag. INVOKER — reads auth.uid().
CREATE OR REPLACE FUNCTION is_system_admin()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    (SELECT is_system_admin FROM profiles WHERE id = auth.uid()),
    false
  );
$$ LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public;

-- ====================================================================
-- PRIVATE SCHEMA
-- ====================================================================

CREATE SCHEMA IF NOT EXISTS private;

-- SECURITY DEFINER function to get user's org IDs (breaks RLS recursion)
CREATE OR REPLACE FUNCTION private.get_user_org_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT organization_id
  FROM public.organization_members
  WHERE user_id = auth.uid()
    AND status = 'active'
$$;

-- ====================================================================
-- RLS POLICIES
-- ====================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;

-- Deny all by default
CREATE POLICY "deny_all_profiles" ON profiles FOR ALL USING (false);
CREATE POLICY "deny_all_organizations" ON organizations FOR ALL USING (false);
CREATE POLICY "deny_all_organization_members" ON organization_members FOR ALL USING (false);
CREATE POLICY "deny_all_roles" ON roles FOR ALL USING (false);
CREATE POLICY "deny_all_role_permissions" ON role_permissions FOR ALL USING (false);
CREATE POLICY "deny_all_audit_logs" ON audit_logs FOR ALL USING (false);
CREATE POLICY "deny_all_todos" ON todos FOR ALL USING (false);
CREATE POLICY "deny_all_invites" ON invites FOR ALL USING (false);

-- Profiles: user can view own profile
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);

-- Audit logs: user can view own + org logs
CREATE POLICY "users_view_own_audit_logs" ON audit_logs FOR SELECT USING (
  user_id = auth.uid()
  OR organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND status = 'active'
  )
);

-- Role permissions: readable by all authenticated users (reference data)
CREATE POLICY "Authenticated can read role_permissions" ON role_permissions FOR SELECT USING (
  auth.uid() IS NOT NULL
);

-- Organizations: read via can_perform
CREATE POLICY "Members can view organizations" ON organizations FOR SELECT USING (
  can_perform('org:read', id)
);
CREATE POLICY "Admins can update organizations" ON organizations FOR UPDATE USING (
  can_perform('org:update', id)
);
CREATE POLICY "Admins can delete organizations" ON organizations FOR DELETE USING (
  can_perform('org:delete', id)
);

-- Organization members: members can see all members in their org + system admin
CREATE POLICY "members_can_read_same_org" ON organization_members FOR SELECT TO authenticated USING (
  organization_id IN (SELECT private.get_user_org_ids())
  OR is_system_admin()
);
CREATE POLICY "Admins can insert members" ON organization_members FOR INSERT WITH CHECK (
  can_perform('members:create', organization_id)
);
CREATE POLICY "Admins can update members" ON organization_members FOR UPDATE USING (
  can_perform('members:update', organization_id)
);
CREATE POLICY "Admins can delete members" ON organization_members FOR DELETE USING (
  can_perform('members:delete', organization_id)
);

-- Todos: all actions via can_perform
CREATE POLICY "Members can view todos" ON todos FOR SELECT USING (
  can_perform('todos:read', organization_id)
);
CREATE POLICY "Members can create todos" ON todos FOR INSERT WITH CHECK (
  can_perform('todos:create', organization_id)
);
CREATE POLICY "Members can update todos" ON todos FOR UPDATE USING (
  can_perform('todos:update', organization_id)
);
CREATE POLICY "Members can delete todos" ON todos FOR DELETE USING (
  can_perform('todos:delete', organization_id)
);

-- Invites: admin/owner actions via can_perform
CREATE POLICY "Admins can view invites" ON invites FOR SELECT USING (
  can_perform('invites:read', organization_id)
);
CREATE POLICY "Admins can create invites" ON invites FOR INSERT WITH CHECK (
  can_perform('invites:create', organization_id)
);
CREATE POLICY "Admins can delete invites" ON invites FOR DELETE USING (
  can_perform('invites:delete', organization_id)
);

-- ====================================================================
-- VIEWS
-- ====================================================================

CREATE VIEW profile_view AS
SELECT id, email, full_name, avatar_url, metadata, created_at, updated_at
FROM profiles;

CREATE VIEW organization_view AS
SELECT
  o.id, o.name, o.slug, o.logo_url, o.description, o.settings, o.created_at, o.updated_at,
  om.user_id, om.role AS user_role, om.status AS membership_status, om.joined_at
FROM organizations o
LEFT JOIN organization_members om ON o.id = om.organization_id;

CREATE VIEW organization_detail_view AS
SELECT
  o.id, o.name, o.slug, o.logo_url, o.description, o.settings, o.created_at, o.updated_at,
  COUNT(DISTINCT om.user_id) AS member_count
FROM organizations o
LEFT JOIN organization_members om ON o.id = om.organization_id AND om.status = 'active'
GROUP BY o.id, o.name, o.slug, o.logo_url, o.description, o.settings, o.created_at, o.updated_at;

CREATE VIEW member_view AS
SELECT
  om.id, om.organization_id, om.user_id,
  p.email, p.full_name, p.avatar_url,
  om.role, om.status, om.joined_at, om.created_at
FROM organization_members om
JOIN profiles p ON om.user_id = p.id;

CREATE VIEW role_view AS
SELECT r.id, r.name, r.description, r.is_system_role, r.created_at
FROM roles r;

-- ====================================================================
-- AUDIT FUNCTIONS
-- ====================================================================

CREATE OR REPLACE FUNCTION audit_action(
  audit_user_id UUID,
  audit_org_id UUID,
  action_name TEXT,
  p_resource_type TEXT DEFAULT NULL,
  p_resource_id UUID DEFAULT NULL,
  audit_metadata JSONB DEFAULT NULL
)
RETURNS UUID AS $$
BEGIN
  INSERT INTO public.audit_logs (
    user_id, organization_id, action, resource_type, resource_id, metadata, ip_address, user_agent
  ) VALUES (
    audit_user_id, audit_org_id, action_name, p_resource_type, p_resource_id, audit_metadata,
    inet_client_addr(),
    COALESCE(current_setting('request.headers', true)::json->>'user-agent', 'unknown')
  );
  RETURN (SELECT id FROM audit_logs ORDER BY created_at DESC LIMIT 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION audit_table_changes()
RETURNS TRIGGER AS $$
DECLARE
  old_data JSONB;
  new_data JSONB;
  operation TEXT;
  v_resource_id UUID;
  v_org_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    operation := TG_TABLE_NAME || '.deleted';
    old_data := to_jsonb(OLD);
    v_resource_id := OLD.id;
  ELSIF TG_OP = 'UPDATE' THEN
    operation := TG_TABLE_NAME || '.updated';
    old_data := to_jsonb(OLD);
    new_data := to_jsonb(NEW);
    v_resource_id := NEW.id;
  ELSIF TG_OP = 'INSERT' THEN
    operation := TG_TABLE_NAME || '.created';
    new_data := to_jsonb(NEW);
    v_resource_id := NEW.id;
  END IF;

  IF TG_TABLE_NAME = 'organizations' THEN
    v_org_id := v_resource_id;
  ELSIF TG_TABLE_NAME = 'organization_members' THEN
    IF TG_OP = 'DELETE' THEN
      v_org_id := OLD.organization_id;
    ELSE
      v_org_id := NEW.organization_id;
    END IF;
  ELSE
    v_org_id := NULL;
  END IF;

  INSERT INTO public.audit_logs (user_id, organization_id, action, resource_type, resource_id, metadata, ip_address)
  VALUES (auth.uid(), v_org_id, operation, TG_TABLE_NAME, v_resource_id,
    jsonb_build_object('old', old_data, 'new', new_data, 'operation', TG_OP), inet_client_addr());

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ====================================================================
-- PROFILE FUNCTIONS
-- ====================================================================

CREATE OR REPLACE FUNCTION get_my_profile()
RETURNS SETOF profiles AS $$
  SELECT * FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION get_user_profile(target_user_id UUID)
RETURNS SETOF profile_view AS $$
  SELECT * FROM profile_view WHERE id = target_user_id;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION update_my_profile(
  new_full_name TEXT DEFAULT NULL,
  new_avatar_url TEXT DEFAULT NULL,
  new_metadata JSONB DEFAULT NULL
)
RETURNS SETOF profile_view AS $$
BEGIN
  UPDATE profiles
  SET
    full_name = COALESCE(new_full_name, full_name),
    avatar_url = COALESCE(new_avatar_url, avatar_url),
    metadata = COALESCE(new_metadata, metadata),
    updated_at = NOW()
  WHERE id = auth.uid();

  RETURN QUERY SELECT * FROM profile_view WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ====================================================================
-- ORGANIZATION FUNCTIONS (all INVOKER — RLS enforces via can_perform)
-- ====================================================================

CREATE OR REPLACE FUNCTION create_organization(
  org_name TEXT,
  org_slug TEXT,
  org_description TEXT DEFAULT NULL,
  org_settings JSONB DEFAULT '{}'
)
RETURNS SETOF organization_view AS $$
DECLARE
  new_org organizations;
BEGIN
  INSERT INTO organizations (name, slug, description, settings)
  VALUES (org_name, org_slug, org_description, org_settings)
  RETURNING * INTO new_org;

  INSERT INTO organization_members (organization_id, user_id, role, status, is_owner)
  VALUES (new_org.id, auth.uid(), 'admin', 'active', true);

  RETURN QUERY SELECT * FROM organization_view WHERE id = new_org.id;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = public;

CREATE OR REPLACE FUNCTION get_my_organizations()
RETURNS SETOF organization_view AS $$
  SELECT * FROM organization_view WHERE user_id = auth.uid();
$$ LANGUAGE sql SECURITY INVOKER SET search_path = public;

CREATE OR REPLACE FUNCTION get_organization(target_org_id UUID)
RETURNS SETOF organization_detail_view AS $$
  SELECT * FROM organization_detail_view WHERE id = target_org_id
  AND can_perform('org:read', target_org_id);
$$ LANGUAGE sql SECURITY INVOKER SET search_path = public;

CREATE OR REPLACE FUNCTION update_organization(
  target_org_id UUID,
  new_name TEXT DEFAULT NULL,
  new_slug TEXT DEFAULT NULL,
  new_description TEXT DEFAULT NULL,
  new_settings JSONB DEFAULT NULL
)
RETURNS SETOF organization_view AS $$
BEGIN
  IF NOT can_perform('org:update', target_org_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE organizations
  SET
    name = COALESCE(new_name, name),
    slug = COALESCE(new_slug, slug),
    description = COALESCE(new_description, description),
    settings = COALESCE(new_settings, settings),
    updated_at = NOW()
  WHERE id = target_org_id;

  RETURN QUERY SELECT * FROM organization_view WHERE id = target_org_id;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = public;

CREATE OR REPLACE FUNCTION delete_organization(target_org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  IF NOT can_perform('org:delete', target_org_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  DELETE FROM organizations WHERE id = target_org_id;
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = public;

-- ====================================================================
-- MEMBER FUNCTIONS (all INVOKER)
-- ====================================================================

CREATE OR REPLACE FUNCTION add_organization_member(
  target_org_id UUID,
  target_user_email TEXT,
  member_role TEXT DEFAULT 'member'
)
RETURNS SETOF member_view AS $$
DECLARE
  target_user_id UUID;
BEGIN
  IF NOT can_perform('members:create', target_org_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT id INTO target_user_id FROM profiles WHERE email = target_user_email;
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  INSERT INTO organization_members (organization_id, user_id, role, status, invited_by)
  VALUES (target_org_id, target_user_id, member_role, 'active', auth.uid())
  ON CONFLICT (organization_id, user_id) DO UPDATE
  SET role = member_role, updated_at = NOW();

  RETURN QUERY SELECT * FROM member_view WHERE organization_id = target_org_id AND user_id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = public;

CREATE OR REPLACE FUNCTION remove_organization_member(
  target_org_id UUID,
  target_user_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  IF NOT can_perform('members:delete', target_org_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  DELETE FROM organization_members WHERE organization_id = target_org_id AND user_id = target_user_id;
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = public;

-- get_organization_members: INVOKER + explicit guard.
-- member_view bypasses RLS (view runs as owner), so the can_perform
-- guard is the actual enforcement.
CREATE OR REPLACE FUNCTION get_organization_members(target_org_id UUID)
RETURNS SETOF member_view AS $$
BEGIN
  IF NOT can_perform('members:read', target_org_id) THEN
    RAISE EXCEPTION 'Not authorized to view members';
  END IF;

  RETURN QUERY
  SELECT * FROM member_view WHERE organization_id = target_org_id;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = public;

CREATE OR REPLACE FUNCTION update_member_role(
  target_org_id UUID,
  target_user_id UUID,
  new_role TEXT
)
RETURNS SETOF member_view AS $$
BEGIN
  IF NOT can_perform('members:update', target_org_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE organization_members SET role = new_role, updated_at = NOW()
  WHERE organization_id = target_org_id AND user_id = target_user_id;

  RETURN QUERY SELECT * FROM member_view WHERE organization_id = target_org_id AND user_id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = public;

CREATE OR REPLACE FUNCTION get_membership(p_org_id UUID)
RETURNS TABLE(role TEXT, permissions TEXT[], is_active BOOLEAN, is_owner BOOLEAN) AS $$
  SELECT om.role,
    (SELECT ARRAY_AGG(rp.permission) FROM role_permissions rp WHERE rp.role = om.role) AS permissions,
    (om.status = 'active') AS is_active,
    om.is_owner
  FROM organization_members om
  WHERE om.organization_id = p_org_id AND om.user_id = auth.uid();
$$ LANGUAGE sql SECURITY INVOKER SET search_path = public;

-- ====================================================================
-- TODO FUNCTIONS (all INVOKER)
-- ====================================================================

CREATE OR REPLACE FUNCTION create_todo(
  p_organization_id UUID,
  p_title TEXT,
  p_description TEXT DEFAULT NULL
)
RETURNS SETOF todos AS $$
BEGIN
  IF NOT can_perform('todos:create', p_organization_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  INSERT INTO todos (organization_id, title, description, created_by)
  VALUES (p_organization_id, p_title, p_description, auth.uid())
  RETURNING *;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = public;

CREATE OR REPLACE FUNCTION get_todos(p_organization_id UUID)
RETURNS SETOF todos AS $$
  SELECT * FROM todos WHERE organization_id = p_organization_id
  AND can_perform('todos:read', p_organization_id)
  ORDER BY created_at DESC;
$$ LANGUAGE sql SECURITY INVOKER SET search_path = public;

CREATE OR REPLACE FUNCTION update_todo(
  p_todo_id UUID,
  p_title TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_completed BOOLEAN DEFAULT NULL
)
RETURNS SETOF todos AS $$
BEGIN
  UPDATE todos
  SET
    title = COALESCE(p_title, title),
    description = COALESCE(p_description, description),
    completed = COALESCE(p_completed, completed),
    updated_at = NOW()
  WHERE id = p_todo_id
  AND can_perform('todos:update', todos.organization_id);

  RETURN QUERY SELECT * FROM todos WHERE id = p_todo_id;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = public;

CREATE OR REPLACE FUNCTION delete_todo(p_todo_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  DELETE FROM todos WHERE id = p_todo_id
  AND can_perform('todos:delete', todos.organization_id);
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = public;

-- ====================================================================
-- INVITE FUNCTIONS
-- ====================================================================

-- create_invite: INVOKER
CREATE OR REPLACE FUNCTION create_invite(
  p_organization_id UUID,
  p_email TEXT,
  p_role TEXT DEFAULT 'member'
)
RETURNS SETOF invites AS $$
BEGIN
  IF NOT can_perform('invites:create', p_organization_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  INSERT INTO invites (organization_id, email, role, invited_by)
  VALUES (p_organization_id, p_email, p_role, auth.uid())
  RETURNING *;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = public;

-- get_invites: INVOKER
CREATE OR REPLACE FUNCTION get_invites(p_organization_id UUID)
RETURNS SETOF invites AS $$
  SELECT * FROM invites
  WHERE organization_id = p_organization_id
  AND accepted_at IS NULL
  AND expires_at > NOW()
  AND can_perform('invites:read', p_organization_id);
$$ LANGUAGE sql SECURITY INVOKER SET search_path = public;

-- validate_invite: SECURITY DEFINER (public — used by invite acceptance flow)
CREATE OR REPLACE FUNCTION validate_invite(p_token TEXT)
RETURNS TABLE(invite_id UUID, org_id UUID, org_name TEXT, invite_email TEXT, invite_role TEXT) AS $$
  SELECT i.id, i.organization_id, o.name, i.email, i.role
  FROM invites i
  JOIN organizations o ON i.organization_id = o.id
  WHERE i.token = p_token AND i.accepted_at IS NULL AND i.expires_at > NOW();
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- accept_invite: SECURITY DEFINER (public — used by invite acceptance flow)
CREATE OR REPLACE FUNCTION accept_invite(p_token TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_invite invites;
BEGIN
  SELECT * INTO v_invite FROM invites
  WHERE token = p_token AND accepted_at IS NULL AND expires_at > NOW();

  IF v_invite IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired invite';
  END IF;

  INSERT INTO organization_members (organization_id, user_id, role, status, invited_by)
  VALUES (v_invite.organization_id, auth.uid(), v_invite.role, 'active', v_invite.invited_by)
  ON CONFLICT (organization_id, user_id) DO NOTHING;

  UPDATE invites SET accepted_at = NOW() WHERE id = v_invite.id;
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- revoke_invite: INVOKER
CREATE OR REPLACE FUNCTION revoke_invite(p_invite_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM invites i
    WHERE i.id = p_invite_id AND can_perform('invites:delete', i.organization_id)
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  DELETE FROM invites WHERE id = p_invite_id;
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = public;

-- ====================================================================
-- SYSTEM ADMIN FUNCTIONS (INVOKER — checks profiles.is_system_admin)
-- ====================================================================

CREATE OR REPLACE FUNCTION get_system_stats()
RETURNS TABLE(total_orgs BIGINT, total_users BIGINT, total_members BIGINT, recent_signups BIGINT) AS $$
BEGIN
  IF NOT is_system_admin() THEN
    RAISE EXCEPTION 'Not authorized: system admin required';
  END IF;

  RETURN QUERY SELECT
    (SELECT COUNT(*) FROM organizations),
    (SELECT COUNT(*) FROM profiles),
    (SELECT COUNT(*) FROM organization_members),
    (SELECT COUNT(*) FROM profiles WHERE created_at > NOW() - INTERVAL '7 days');
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = public;

CREATE OR REPLACE FUNCTION get_all_organizations()
RETURNS SETOF organization_detail_view AS $$
BEGIN
  IF NOT is_system_admin() THEN
    RAISE EXCEPTION 'Not authorized: system admin required';
  END IF;

  RETURN QUERY SELECT * FROM organization_detail_view;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = public;

CREATE OR REPLACE FUNCTION grant_system_admin(target_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  IF NOT is_system_admin() THEN
    RAISE EXCEPTION 'Not authorized: system admin required';
  END IF;

  UPDATE profiles SET is_system_admin = true WHERE id = target_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'User not found'; END IF;
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = public;

CREATE OR REPLACE FUNCTION revoke_system_admin(target_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  IF NOT is_system_admin() THEN
    RAISE EXCEPTION 'Not authorized: system admin required';
  END IF;

  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot revoke your own system admin status';
  END IF;

  UPDATE profiles SET is_system_admin = false WHERE id = target_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'User not found'; END IF;
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = public;

CREATE OR REPLACE FUNCTION get_system_admins()
RETURNS SETOF profile_view AS $$
BEGIN
  IF NOT is_system_admin() THEN
    RAISE EXCEPTION 'Not authorized: system admin required';
  END IF;

  RETURN QUERY SELECT * FROM profiles WHERE is_system_admin = true;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = public;

CREATE OR REPLACE FUNCTION bootstrap_system_admin()
RETURNS BOOLEAN AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_system_admin = true) THEN
    RETURN true;
  END IF;

  IF EXISTS (SELECT 1 FROM profiles WHERE is_system_admin = true) THEN
    RAISE EXCEPTION 'System admin already exists. Use grant_system_admin() instead.';
  END IF;

  UPDATE profiles SET is_system_admin = true WHERE id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'No profile found for current user'; END IF;
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- NOTE: set_system_admin(), reset_development_data() and create_test_user()
-- are intentionally NOT defined in migrations — they are destructive
-- privilege/data helpers that must never exist in production. They live in
-- supabase/dev_helpers.sql and are applied manually to local dev only (see
-- scripts/bootstrap-admin.sh).

-- ====================================================================
-- AUTH HANDLER (SECURITY DEFINER — trigger runs outside user context)
-- ====================================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  default_org_slug TEXT;
  default_org_id UUID;
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));

  default_org_slug := split_part(NEW.email, '@', 1) || '-' || substr(NEW.id::text, 1, 8);

  INSERT INTO public.organizations (name, slug)
  VALUES (COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)), default_org_slug)
  RETURNING id INTO default_org_id;

  INSERT INTO public.organization_members (organization_id, user_id, role, status, is_owner, joined_at)
  VALUES (default_org_id, NEW.id, 'admin', 'active', true, NOW());

  PERFORM public.audit_action(NEW.id, default_org_id, 'user.onboarding_completed', 'organization', default_org_id,
    jsonb_build_object('email', NEW.email, 'auto_created', true));

  PERFORM public.audit_action(NEW.id, NULL, 'user.created', 'profile', NEW.id,
    jsonb_build_object('email', NEW.email));

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Failed to create default organization for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ====================================================================
-- TRIGGERS
-- ====================================================================

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

CREATE TRIGGER audit_organizations_changes
  AFTER INSERT OR UPDATE OR DELETE ON organizations
  FOR EACH ROW EXECUTE FUNCTION audit_table_changes();

CREATE TRIGGER audit_organization_members_changes
  AFTER INSERT OR UPDATE OR DELETE ON organization_members
  FOR EACH ROW EXECUTE FUNCTION audit_table_changes();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organization_members_updated_at BEFORE UPDATE ON organization_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_todos_updated_at BEFORE UPDATE ON todos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ====================================================================
-- SEED DATA
-- ====================================================================

-- Organization roles (no owner — owner is is_owner flag on admin)
INSERT INTO roles (name, description, is_system_role) VALUES
  ('admin', 'Organization administrator with elevated access', false),
  ('member', 'Organization member with standard access', false),
  ('viewer', 'Organization viewer with read-only access', false)
ON CONFLICT (name) DO NOTHING;

-- Role permissions (one row per role + permission, resource:action format)
INSERT INTO role_permissions (role, permission) VALUES
  -- Admin: full org + members + todos + invites
  ('admin', 'org:read'), ('admin', 'org:update'), ('admin', 'org:delete'),
  ('admin', 'members:read'), ('admin', 'members:create'), ('admin', 'members:update'), ('admin', 'members:delete'),
  ('admin', 'todos:read'), ('admin', 'todos:create'), ('admin', 'todos:update'), ('admin', 'todos:delete'),
  ('admin', 'invites:read'), ('admin', 'invites:create'), ('admin', 'invites:delete'),
  -- Member: read org, manage own todos, read invites
  ('member', 'org:read'), ('member', 'members:read'),
  ('member', 'todos:read'), ('member', 'todos:create'), ('member', 'todos:update'), ('member', 'todos:delete'),
  ('member', 'invites:read'),
  -- Viewer: read-only
  ('viewer', 'org:read'), ('viewer', 'members:read'), ('viewer', 'todos:read')
ON CONFLICT (role, permission) DO NOTHING;

-- ====================================================================
-- GRANTS
-- ====================================================================

GRANT SELECT ON profile_view TO authenticated;
GRANT SELECT ON organization_view TO authenticated;
GRANT SELECT ON organization_detail_view TO authenticated;
GRANT SELECT ON member_view TO authenticated;

GRANT EXECUTE ON FUNCTION get_my_profile() TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_profile(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION update_my_profile(TEXT, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION create_organization(TEXT, TEXT, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION get_my_organizations() TO authenticated;
GRANT EXECUTE ON FUNCTION get_organization(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION update_organization(UUID, TEXT, TEXT, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_organization(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION add_organization_member(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION remove_organization_member(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_organization_members(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION update_member_role(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_membership(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION create_todo(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_todos(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION update_todo(UUID, TEXT, TEXT, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_todo(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION create_invite(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_invites(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_invite(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION accept_invite(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION revoke_invite(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_system_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_organizations() TO authenticated;
GRANT EXECUTE ON FUNCTION is_system_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION grant_system_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION revoke_system_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_system_admins() TO authenticated;
GRANT EXECUTE ON FUNCTION bootstrap_system_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION can_perform(TEXT, UUID) TO authenticated;

-- ====================================================================
-- MIGRATION COMPLETE
-- ====================================================================
