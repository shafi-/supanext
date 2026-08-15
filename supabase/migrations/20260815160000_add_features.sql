-- ====================================================================
-- Migration: Add Features (todos, invites, views, RLS)
-- ====================================================================
-- Adds:
-- 1. Todos table with organization scoping
-- 2. Invites table with token-based flow
-- 3. is_system_admin column to profiles
-- 4. Views for profiles, organizations, members
-- 5. All RPC functions (SECURITY INVOKER)
-- 6. RLS policies for all tables
-- ====================================================================

-- ====================================================================
-- TABLES
-- ====================================================================

-- todos: Organization-scoped task tracking
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

-- invites: Token-based organization invites
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

-- Add system admin flag to profiles
ALTER TABLE profiles ADD COLUMN is_system_admin BOOLEAN DEFAULT false;

-- ====================================================================
-- INDEXES
-- ====================================================================

CREATE INDEX idx_todos_organization_id ON todos(organization_id);
CREATE INDEX idx_todos_created_by ON todos(created_by);
CREATE INDEX idx_invites_organization_id ON invites(organization_id);
CREATE INDEX idx_invites_email ON invites(email);
CREATE INDEX idx_invites_token ON invites(token);

-- ====================================================================
-- VIEWS
-- ====================================================================

-- profile_view: Safe profile read
CREATE OR REPLACE VIEW profile_view AS
SELECT id, email, full_name, avatar_url, metadata, created_at, updated_at
FROM profiles;

-- organization_view: Org with membership info
CREATE OR REPLACE VIEW organization_view AS
SELECT
  o.id,
  o.name,
  o.slug,
  o.logo_url,
  o.description,
  o.settings,
  o.created_at,
  o.updated_at,
  om.user_id,
  om.role AS user_role,
  om.status AS membership_status,
  om.joined_at
FROM organizations o
JOIN organization_members om ON o.id = om.organization_id;

-- organization_detail_view: Org with member count
CREATE OR REPLACE VIEW organization_detail_view AS
SELECT
  o.*,
  (SELECT COUNT(*) FROM organization_members WHERE organization_id = o.id) AS member_count
FROM organizations o;

-- member_view: Members with profile info
CREATE OR REPLACE VIEW member_view AS
SELECT
  om.id,
  om.organization_id,
  om.user_id,
  p.email,
  p.full_name,
  p.avatar_url,
  om.role,
  om.status,
  om.joined_at,
  om.created_at
FROM organization_members om
JOIN profiles p ON om.user_id = p.id;

-- ====================================================================
-- FUNCTIONS (all SECURITY INVOKER)
-- ====================================================================

-- Profile functions
CREATE OR REPLACE FUNCTION get_my_profile()
RETURNS SETOF profile_view
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT * FROM profile_view WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION get_user_profile(target_user_id UUID)
RETURNS SETOF profile_view
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT * FROM profile_view WHERE id = target_user_id;
$$;

CREATE OR REPLACE FUNCTION update_my_profile(
  new_full_name TEXT DEFAULT NULL,
  new_avatar_url TEXT DEFAULT NULL,
  new_metadata JSONB DEFAULT NULL
)
RETURNS SETOF profile_view
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
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
$$;

-- Organization functions
CREATE OR REPLACE FUNCTION create_organization(
  org_name TEXT,
  org_slug TEXT,
  org_description TEXT DEFAULT NULL,
  org_settings JSONB DEFAULT '{}'
)
RETURNS SETOF organization_view
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
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
$$;

CREATE OR REPLACE FUNCTION get_my_organizations()
RETURNS SETOF organization_view
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT * FROM organization_view WHERE user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION get_organization(target_org_id UUID)
RETURNS SETOF organization_detail_view
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT * FROM organization_detail_view WHERE id = target_org_id
  AND id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION update_organization(
  target_org_id UUID,
  new_name TEXT DEFAULT NULL,
  new_slug TEXT DEFAULT NULL,
  new_description TEXT DEFAULT NULL,
  new_settings JSONB DEFAULT NULL
)
RETURNS SETOF organization_view
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
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
$$;

CREATE OR REPLACE FUNCTION delete_organization(target_org_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  IF NOT is_admin_or_owner(auth.uid(), target_org_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  DELETE FROM organizations WHERE id = target_org_id;
  RETURN true;
END;
$$;

-- Member functions
CREATE OR REPLACE FUNCTION add_organization_member(
  target_org_id UUID,
  target_user_email TEXT,
  member_role TEXT DEFAULT 'member'
)
RETURNS SETOF member_view
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
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
$$;

CREATE OR REPLACE FUNCTION remove_organization_member(
  target_org_id UUID,
  target_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  IF NOT is_admin_or_owner(auth.uid(), target_org_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  DELETE FROM organization_members
  WHERE organization_id = target_org_id AND user_id = target_user_id;

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION get_organization_members(target_org_id UUID)
RETURNS SETOF member_view
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT * FROM member_view WHERE organization_id = target_org_id
  AND organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION update_member_role(
  target_org_id UUID,
  target_user_id UUID,
  new_role TEXT
)
RETURNS SETOF member_view
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  IF NOT is_admin_or_owner(auth.uid(), target_org_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE organization_members
  SET role = new_role, updated_at = NOW()
  WHERE organization_id = target_org_id AND user_id = target_user_id;

  RETURN QUERY SELECT * FROM member_view WHERE organization_id = target_org_id AND user_id = target_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION get_membership(p_org_id UUID)
RETURNS TABLE(role TEXT, permissions TEXT[], is_active BOOLEAN)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT
    om.role,
    COALESCE(r.permissions, '{}') AS permissions,
    (om.status = 'active') AS is_active
  FROM organization_members om
  LEFT JOIN roles r ON r.name = om.role
  WHERE om.organization_id = p_org_id AND om.user_id = auth.uid();
$$;

-- Todo functions
CREATE OR REPLACE FUNCTION create_todo(
  p_organization_id UUID,
  p_title TEXT,
  p_description TEXT DEFAULT NULL
)
RETURNS SETOF todos
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  IF NOT is_member(auth.uid(), p_organization_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  INSERT INTO todos (organization_id, title, description, created_by)
  VALUES (p_organization_id, p_title, p_description, auth.uid())
  RETURNING *;
END;
$$;

CREATE OR REPLACE FUNCTION get_todos(p_organization_id UUID)
RETURNS SETOF todos
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT * FROM todos
  WHERE organization_id = p_organization_id
  AND organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())
  ORDER BY created_at DESC;
$$;

CREATE OR REPLACE FUNCTION update_todo(
  p_todo_id UUID,
  p_title TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_completed BOOLEAN DEFAULT NULL
)
RETURNS SETOF todos
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
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
$$;

CREATE OR REPLACE FUNCTION delete_todo(p_todo_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  DELETE FROM todos
  WHERE id = p_todo_id
  AND organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid());

  RETURN true;
END;
$$;

-- Invite functions
CREATE OR REPLACE FUNCTION create_invite(
  p_organization_id UUID,
  p_email TEXT,
  p_role TEXT DEFAULT 'member'
)
RETURNS SETOF invites
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  IF NOT is_admin_or_owner(auth.uid(), p_organization_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  INSERT INTO invites (organization_id, email, role, invited_by)
  VALUES (p_organization_id, p_email, p_role, auth.uid())
  RETURNING *;
END;
$$;

CREATE OR REPLACE FUNCTION get_invites(p_organization_id UUID)
RETURNS SETOF invites
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT * FROM invites
  WHERE organization_id = p_organization_id
  AND accepted_at IS NULL
  AND expires_at > NOW()
  AND organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION validate_invite(p_token TEXT)
RETURNS TABLE(invite_id UUID, org_id UUID, org_name TEXT, invite_email TEXT, invite_role TEXT)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT i.id, i.organization_id, o.name, i.email, i.role
  FROM invites i
  JOIN organizations o ON i.organization_id = o.id
  WHERE i.token = p_token
  AND i.accepted_at IS NULL
  AND i.expires_at > NOW();
$$;

CREATE OR REPLACE FUNCTION accept_invite(p_token TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_invite invites;
BEGIN
  SELECT * INTO v_invite FROM invites
  WHERE token = p_token
  AND accepted_at IS NULL
  AND expires_at > NOW();

  IF v_invite IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired invite';
  END IF;

  INSERT INTO organization_members (organization_id, user_id, role, status, invited_by)
  VALUES (v_invite.organization_id, auth.uid(), v_invite.role, 'active', v_invite.invited_by)
  ON CONFLICT (organization_id, user_id) DO NOTHING;

  UPDATE invites SET accepted_at = NOW() WHERE id = v_invite.id;

  RETURN true;
END;
$$;

-- System admin functions
CREATE OR REPLACE FUNCTION get_system_stats()
RETURNS TABLE(total_orgs BIGINT, total_users BIGINT, total_members BIGINT, recent_signups BIGINT)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT
    (SELECT COUNT(*) FROM organizations),
    (SELECT COUNT(*) FROM profiles),
    (SELECT COUNT(*) FROM organization_members),
    (SELECT COUNT(*) FROM profiles WHERE created_at > NOW() - INTERVAL '7 days');
$$;

CREATE OR REPLACE FUNCTION get_all_organizations()
RETURNS SETOF organization_detail_view
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT * FROM organization_detail_view;
$$;

-- ====================================================================
-- RLS POLICIES
-- ====================================================================

-- profiles: Users can read their own, system admin can read all
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "System admins can view all profiles" ON profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_system_admin = true)
  );

-- organizations: Members can read, owners/admins can update
CREATE POLICY "Members can view organizations" ON organizations
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM organization_members WHERE organization_id = id AND user_id = auth.uid())
  );

CREATE POLICY "Owners/admins can update organizations" ON organizations
  FOR UPDATE USING (is_admin_or_owner(auth.uid(), id));

CREATE POLICY "Owners/admins can delete organizations" ON organizations
  FOR DELETE USING (is_admin_or_owner(auth.uid(), id));

-- organization_members: Members can read, admins can manage
CREATE POLICY "Members can view members" ON organization_members
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM organization_members WHERE organization_id = organization_members.organization_id AND user_id = auth.uid())
  );

CREATE POLICY "Admins can insert members" ON organization_members
  FOR INSERT WITH CHECK (is_admin_or_owner(auth.uid(), organization_id));

CREATE POLICY "Admins can update members" ON organization_members
  FOR UPDATE USING (is_admin_or_owner(auth.uid(), organization_id));

CREATE POLICY "Admins can delete members" ON organization_members
  FOR DELETE USING (is_admin_or_owner(auth.uid(), organization_id));

-- todos: Members can CRUD
CREATE POLICY "Members can view todos" ON todos
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM organization_members WHERE organization_id = todos.organization_id AND user_id = auth.uid())
  );

CREATE POLICY "Members can create todos" ON todos
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM organization_members WHERE organization_id = todos.organization_id AND user_id = auth.uid())
  );

CREATE POLICY "Members can update todos" ON todos
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM organization_members WHERE organization_id = todos.organization_id AND user_id = auth.uid())
  );

CREATE POLICY "Members can delete todos" ON todos
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM organization_members WHERE organization_id = todos.organization_id AND user_id = auth.uid())
  );

-- invites: Admins can manage
CREATE POLICY "Admins can view invites" ON invites
  FOR SELECT USING (is_admin_or_owner(auth.uid(), organization_id));

CREATE POLICY "Admins can create invites" ON invites
  FOR INSERT WITH CHECK (is_admin_or_owner(auth.uid(), organization_id));

CREATE POLICY "Admins can delete invites" ON invites
  FOR DELETE USING (is_admin_or_owner(auth.uid(), organization_id));

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
GRANT EXECUTE ON FUNCTION get_system_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_organizations() TO authenticated;
