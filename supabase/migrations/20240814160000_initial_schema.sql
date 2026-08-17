-- ====================================================================
-- SupaNext: Consolidated Migration
-- ====================================================================
-- Function-first architecture:
-- 1. All operations through PostgreSQL functions (no direct table access)
-- 2. Restrictive RLS (deny all by default, selective policies)
-- 3. Business logic encapsulated in database functions
-- 4. SECURITY DEFINER on all functions
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
  permissions TEXT[] DEFAULT '{}',
  is_system_role BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
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

-- ====================================================================
-- HELPER FUNCTIONS (must exist before RLS policies reference them)
-- ====================================================================

CREATE OR REPLACE FUNCTION is_member(check_user_id UUID, check_org_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE user_id = check_user_id AND organization_id = check_org_id AND status = 'active'
  );
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION is_admin_or_owner(check_user_id UUID, check_org_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE user_id = check_user_id AND organization_id = check_org_id
      AND role IN ('admin', 'owner') AND status = 'active'
  );
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION get_user_role(check_user_id UUID, check_org_id UUID)
RETURNS TEXT AS $$
  SELECT role FROM organization_members
  WHERE user_id = check_user_id AND organization_id = check_org_id AND status = 'active'
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION is_system_admin(check_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    (SELECT is_system_admin FROM profiles WHERE id = check_user_id),
    false
  );
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- ====================================================================
-- RLS POLICIES
-- ====================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;

-- Deny all by default
CREATE POLICY "deny_all_profiles" ON profiles FOR ALL USING (false);
CREATE POLICY "deny_all_organizations" ON organizations FOR ALL USING (false);
CREATE POLICY "deny_all_organization_members" ON organization_members FOR ALL USING (false);
CREATE POLICY "deny_all_roles" ON roles FOR ALL USING (false);
CREATE POLICY "deny_all_audit_logs" ON audit_logs FOR ALL USING (false);
CREATE POLICY "deny_all_todos" ON todos FOR ALL USING (false);
CREATE POLICY "deny_all_invites" ON invites FOR ALL USING (false);

-- Selective policies
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "users_view_own_audit_logs" ON audit_logs FOR SELECT USING (
  user_id = auth.uid()
  OR organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND status = 'active'
  )
);

CREATE POLICY "Members can view organizations" ON organizations FOR SELECT USING (
  EXISTS (SELECT 1 FROM organization_members WHERE organization_id = id AND user_id = auth.uid())
);

CREATE POLICY "Owners/admins can update organizations" ON organizations FOR UPDATE USING (is_admin_or_owner(auth.uid(), id));

CREATE POLICY "Owners/admins can delete organizations" ON organizations FOR DELETE USING (is_admin_or_owner(auth.uid(), id));

CREATE POLICY "Members can view members" ON organization_members FOR SELECT USING (
  EXISTS (SELECT 1 FROM organization_members om WHERE om.organization_id = organization_members.organization_id AND om.user_id = auth.uid())
);

CREATE POLICY "Admins can insert members" ON organization_members FOR INSERT WITH CHECK (is_admin_or_owner(auth.uid(), organization_id));

CREATE POLICY "Admins can update members" ON organization_members FOR UPDATE USING (is_admin_or_owner(auth.uid(), organization_id));

CREATE POLICY "Admins can delete members" ON organization_members FOR DELETE USING (is_admin_or_owner(auth.uid(), organization_id));

CREATE POLICY "Members can view todos" ON todos FOR SELECT USING (
  EXISTS (SELECT 1 FROM organization_members WHERE organization_id = todos.organization_id AND user_id = auth.uid())
);

CREATE POLICY "Members can create todos" ON todos FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM organization_members WHERE organization_id = todos.organization_id AND user_id = auth.uid())
);

CREATE POLICY "Members can update todos" ON todos FOR UPDATE USING (
  EXISTS (SELECT 1 FROM organization_members WHERE organization_id = todos.organization_id AND user_id = auth.uid())
);

CREATE POLICY "Members can delete todos" ON todos FOR DELETE USING (
  EXISTS (SELECT 1 FROM organization_members WHERE organization_id = todos.organization_id AND user_id = auth.uid())
);

CREATE POLICY "Admins can view invites" ON invites FOR SELECT USING (is_admin_or_owner(auth.uid(), organization_id));

CREATE POLICY "Admins can create invites" ON invites FOR INSERT WITH CHECK (is_admin_or_owner(auth.uid(), organization_id));

CREATE POLICY "Admins can delete invites" ON invites FOR DELETE USING (is_admin_or_owner(auth.uid(), organization_id));

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
SELECT r.id, r.name, r.description, r.permissions, r.is_system_role, r.created_at
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
-- ORGANIZATION FUNCTIONS
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

  INSERT INTO organization_members (organization_id, user_id, role, status)
  VALUES (new_org.id, auth.uid(), 'owner', 'active');

  RETURN QUERY SELECT * FROM organization_view WHERE id = new_org.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION get_my_organizations()
RETURNS SETOF organization_view AS $$
  SELECT * FROM organization_view WHERE user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION get_organization(target_org_id UUID)
RETURNS SETOF organization_detail_view AS $$
  SELECT * FROM organization_detail_view WHERE id = target_org_id
  AND id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid());
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION update_organization(
  target_org_id UUID,
  new_name TEXT DEFAULT NULL,
  new_slug TEXT DEFAULT NULL,
  new_description TEXT DEFAULT NULL,
  new_settings JSONB DEFAULT NULL
)
RETURNS SETOF organization_view AS $$
BEGIN
  IF NOT is_admin_or_owner(auth.uid(), target_org_id) THEN
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION delete_organization(target_org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  IF NOT is_admin_or_owner(auth.uid(), target_org_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  DELETE FROM organizations WHERE id = target_org_id;
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ====================================================================
-- MEMBER FUNCTIONS
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
  IF NOT is_admin_or_owner(auth.uid(), target_org_id) THEN
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION remove_organization_member(
  target_org_id UUID,
  target_user_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  IF NOT is_admin_or_owner(auth.uid(), target_org_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  DELETE FROM organization_members WHERE organization_id = target_org_id AND user_id = target_user_id;
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION get_organization_members(target_org_id UUID)
RETURNS SETOF member_view AS $$
  SELECT * FROM member_view WHERE organization_id = target_org_id
  AND organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid());
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION update_member_role(
  target_org_id UUID,
  target_user_id UUID,
  new_role TEXT
)
RETURNS SETOF member_view AS $$
BEGIN
  IF NOT is_admin_or_owner(auth.uid(), target_org_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE organization_members SET role = new_role, updated_at = NOW()
  WHERE organization_id = target_org_id AND user_id = target_user_id;

  RETURN QUERY SELECT * FROM member_view WHERE organization_id = target_org_id AND user_id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION get_membership(p_org_id UUID)
RETURNS TABLE(role TEXT, permissions TEXT[], is_active BOOLEAN) AS $$
  SELECT om.role, COALESCE(r.permissions, '{}') AS permissions, (om.status = 'active') AS is_active
  FROM organization_members om
  LEFT JOIN roles r ON r.name = om.role
  WHERE om.organization_id = p_org_id AND om.user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- ====================================================================
-- TODO FUNCTIONS
-- ====================================================================

CREATE OR REPLACE FUNCTION create_todo(
  p_organization_id UUID,
  p_title TEXT,
  p_description TEXT DEFAULT NULL
)
RETURNS SETOF todos AS $$
BEGIN
  IF NOT is_member(auth.uid(), p_organization_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  INSERT INTO todos (organization_id, title, description, created_by)
  VALUES (p_organization_id, p_title, p_description, auth.uid())
  RETURNING *;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION get_todos(p_organization_id UUID)
RETURNS SETOF todos AS $$
  SELECT * FROM todos WHERE organization_id = p_organization_id
  AND organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())
  ORDER BY created_at DESC;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

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
  AND organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid());

  RETURN QUERY SELECT * FROM todos WHERE id = p_todo_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION delete_todo(p_todo_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  DELETE FROM todos WHERE id = p_todo_id
  AND organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid());
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ====================================================================
-- INVITE FUNCTIONS
-- ====================================================================

CREATE OR REPLACE FUNCTION create_invite(
  p_organization_id UUID,
  p_email TEXT,
  p_role TEXT DEFAULT 'member'
)
RETURNS SETOF invites AS $$
BEGIN
  IF NOT is_admin_or_owner(auth.uid(), p_organization_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  INSERT INTO invites (organization_id, email, role, invited_by)
  VALUES (p_organization_id, p_email, p_role, auth.uid())
  RETURNING *;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION get_invites(p_organization_id UUID)
RETURNS SETOF invites AS $$
  SELECT * FROM invites
  WHERE organization_id = p_organization_id
  AND accepted_at IS NULL
  AND expires_at > NOW()
  AND organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid());
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION validate_invite(p_token TEXT)
RETURNS TABLE(invite_id UUID, org_id UUID, org_name TEXT, invite_email TEXT, invite_role TEXT) AS $$
  SELECT i.id, i.organization_id, o.name, i.email, i.role
  FROM invites i
  JOIN organizations o ON i.organization_id = o.id
  WHERE i.token = p_token AND i.accepted_at IS NULL AND i.expires_at > NOW();
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

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

CREATE OR REPLACE FUNCTION revoke_invite(p_invite_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM invites i
    WHERE i.id = p_invite_id AND is_admin_or_owner(auth.uid(), i.organization_id)
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  DELETE FROM invites WHERE id = p_invite_id;
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ====================================================================
-- SYSTEM ADMIN FUNCTIONS
-- ====================================================================

CREATE OR REPLACE FUNCTION get_system_stats()
RETURNS TABLE(total_orgs BIGINT, total_users BIGINT, total_members BIGINT, recent_signups BIGINT) AS $$
BEGIN
  IF NOT is_system_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized: system admin required';
  END IF;

  RETURN QUERY SELECT
    (SELECT COUNT(*) FROM organizations),
    (SELECT COUNT(*) FROM profiles),
    (SELECT COUNT(*) FROM organization_members),
    (SELECT COUNT(*) FROM profiles WHERE created_at > NOW() - INTERVAL '7 days');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION get_all_organizations()
RETURNS SETOF organization_detail_view AS $$
BEGIN
  IF NOT is_system_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized: system admin required';
  END IF;

  RETURN QUERY SELECT * FROM organization_detail_view;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION grant_system_admin(target_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  IF NOT is_system_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized: system admin required';
  END IF;

  UPDATE profiles SET is_system_admin = true WHERE id = target_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'User not found'; END IF;
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION revoke_system_admin(target_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  IF NOT is_system_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized: system admin required';
  END IF;

  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot revoke your own system admin status';
  END IF;

  UPDATE profiles SET is_system_admin = false WHERE id = target_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'User not found'; END IF;
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION get_system_admins()
RETURNS SETOF profile_view AS $$
BEGIN
  IF NOT is_system_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized: system admin required';
  END IF;

  RETURN QUERY SELECT * FROM profiles WHERE is_system_admin = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

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

-- CLI/Script helper: set any user as system admin (no auth check, SECURITY DEFINER)
CREATE OR REPLACE FUNCTION set_system_admin(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE profiles SET is_system_admin = true WHERE id = p_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'User not found'; END IF;
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ====================================================================
-- AUTH HANDLER
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

  INSERT INTO public.organization_members (organization_id, user_id, role, status, joined_at)
  VALUES (default_org_id, NEW.id, 'owner', 'active', NOW());

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

-- Organization roles only (no system roles)
INSERT INTO roles (name, description, permissions, is_system_role) VALUES
  ('owner', 'Organization owner with full access', ARRAY['*'], false),
  ('admin', 'Organization administrator with elevated access', ARRAY['create', 'read', 'update', 'delete'], false),
  ('member', 'Organization member with standard access', ARRAY['read', 'update:own'], false),
  ('viewer', 'Organization viewer with read-only access', ARRAY['read'], false)
ON CONFLICT (name) DO NOTHING;

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
GRANT EXECUTE ON FUNCTION is_system_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION grant_system_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION revoke_system_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_system_admins() TO authenticated;
GRANT EXECUTE ON FUNCTION bootstrap_system_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION set_system_admin(UUID) TO authenticated;

-- ====================================================================
-- DEV HELPER FUNCTIONS (Optional)
-- ====================================================================

CREATE OR REPLACE FUNCTION reset_development_data()
RETURNS void AS $$
BEGIN
  RAISE NOTICE 'Resetting development data...';
  DELETE FROM audit_logs;
  DELETE FROM organization_members;
  DELETE FROM organizations;
  DELETE FROM profiles;
  DELETE FROM roles;
  RAISE NOTICE 'Development data reset completed';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION create_test_user(
  test_email TEXT,
  test_full_name TEXT DEFAULT 'Test User',
  test_org_name TEXT DEFAULT 'Test Organization'
)
RETURNS UUID AS $$
DECLARE
  test_user_id UUID;
  test_org_id UUID;
BEGIN
  test_user_id := gen_random_uuid();
  INSERT INTO profiles (id, email, full_name) VALUES (test_user_id, test_email, test_full_name);
  INSERT INTO organizations (name, slug)
  VALUES (test_org_name, lower(regexp_replace(test_org_name, '[^a-zA-Z0-9]+', '-', 'g')))
  RETURNING id INTO test_org_id;
  INSERT INTO organization_members (organization_id, user_id, role, status, joined_at)
  VALUES (test_org_id, test_user_id, 'owner', 'active', NOW());
  RETURN test_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ====================================================================
-- MIGRATION COMPLETE
-- ====================================================================
