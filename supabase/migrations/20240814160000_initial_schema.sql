-- ====================================================================
-- Initial Migration: Function-First Architecture
-- ====================================================================
-- This migration implements a database-driven architecture where:
-- 1. All database operations go through functions (no direct table access)
-- 2. RLS policies are restrictive by default (deny all)
-- 3. Business logic is encapsulated in database functions
-- 4. Selective RLS is used where complex filtering is needed
-- ====================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ====================================================================
-- TABLES
-- ====================================================================

-- profiles: Extends auth.users with additional user information
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- organizations: Teams, companies, or workspaces
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

-- organization_members: Many-to-many relationship between users and organizations
CREATE TABLE organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member', -- owner, admin, member, viewer
  status TEXT NOT NULL DEFAULT 'active', -- active, invited, suspended
  invited_by UUID REFERENCES profiles(id),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

-- roles: System-wide role definitions
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  permissions TEXT[] DEFAULT '{}',
  is_system_role BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- audit_logs: Track important user and system actions
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

-- ====================================================================
-- RESTRICTIVE RLS POLICIES (Default Deny All)
-- ====================================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Default: Deny all direct access
CREATE POLICY "deny_all_profiles" ON profiles FOR ALL USING (false);
CREATE POLICY "deny_all_organizations" ON organizations FOR ALL USING (false);
CREATE POLICY "deny_all_organization_members" ON organization_members FOR ALL USING (false);
CREATE POLICY "deny_all_roles" ON roles FOR ALL USING (false);
CREATE POLICY "deny_all_audit_logs" ON audit_logs FOR ALL USING (false);

-- ====================================================================
-- VIEWS FOR CLEAN DATA RETURN
-- ====================================================================

-- Profile view
CREATE VIEW profile_view AS
SELECT
  p.id,
  p.email,
  p.full_name,
  p.avatar_url,
  p.metadata,
  p.created_at,
  p.updated_at
FROM profiles p;

-- Organization view with membership info
CREATE VIEW organization_view AS
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
  om.role as user_role,
  om.status as membership_status,
  om.joined_at
FROM organizations o
LEFT JOIN organization_members om ON o.id = om.organization_id;

-- Organization detail view
CREATE VIEW organization_detail_view AS
SELECT
  o.id,
  o.name,
  o.slug,
  o.logo_url,
  o.description,
  o.settings,
  o.created_at,
  o.updated_at,
  COUNT(DISTINCT om.user_id) as member_count
FROM organizations o
LEFT JOIN organization_members om ON o.id = om.organization_id AND om.status = 'active'
GROUP BY o.id, o.name, o.slug, o.logo_url, o.description, o.settings, o.created_at, o.updated_at;

-- Member view
CREATE VIEW member_view AS
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

-- Role view
CREATE VIEW role_view AS
SELECT
  r.id,
  r.name,
  r.description,
  r.permissions,
  r.is_system_role,
  r.created_at
FROM roles r;

-- ====================================================================
-- HELPER FUNCTIONS (Generic Utilities)
-- ====================================================================

-- Check if user is member of organization
CREATE OR REPLACE FUNCTION is_member(check_user_id UUID, check_org_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE user_id = is_member.check_user_id
      AND organization_id = is_member.check_org_id
      AND status = 'active'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Check if user is admin or owner of organization
CREATE OR REPLACE FUNCTION is_admin_or_owner(check_user_id UUID, check_org_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE user_id = is_admin_or_owner.check_user_id
      AND organization_id = is_admin_or_owner.check_org_id
      AND role IN ('admin', 'owner')
      AND status = 'active'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Get user role in organization
CREATE OR REPLACE FUNCTION get_user_role(check_user_id UUID, check_org_id UUID)
RETURNS TEXT AS $$
  SELECT role FROM organization_members
  WHERE user_id = get_user_role.check_user_id
    AND organization_id = get_user_role.check_org_id
    AND status = 'active'
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- Check if user is system admin
CREATE OR REPLACE FUNCTION is_system_admin(check_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM roles r
    JOIN organization_members om ON r.name = om.role
    WHERE om.user_id = is_system_admin.check_user_id
      AND r.is_system_role = true
      AND r.name = 'admin'
      AND om.status = 'active'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- ====================================================================
-- AUDIT FUNCTIONS
-- ====================================================================

-- Central audit logging function
CREATE OR REPLACE FUNCTION audit_action(
  audit_user_id UUID,
  audit_org_id UUID,
  action_name TEXT,
  resource_type TEXT DEFAULT NULL,
  resource_id UUID DEFAULT NULL,
  audit_metadata JSONB DEFAULT NULL
)
RETURNS UUID AS $$
  INSERT INTO audit_logs (
    user_id,
    organization_id,
    action,
    resource_type,
    resource_id,
    metadata,
    ip_address,
    user_agent
  ) VALUES (
    audit_action.audit_user_id,
    audit_action.audit_org_id,
    audit_action.action_name,
    audit_action.resource_type,
    audit_action.resource_id,
    audit_action.audit_metadata,
    inet_client_addr(),
    current_setting('request.headers')::json->>'user-agent'
  )
  RETURNING id;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auto-audit trigger function for table changes
CREATE OR REPLACE FUNCTION audit_table_changes()
RETURNS TRIGGER AS $$
DECLARE
  old_data JSONB;
  new_data JSONB;
  operation TEXT;
BEGIN
  -- Determine operation type
  IF TG_OP = 'DELETE' THEN
    operation := TG_TABLE_NAME || '.deleted';
    old_data := to_jsonb(OLD);
    new_data := NULL;
  ELSIF TG_OP = 'UPDATE' THEN
    operation := TG_TABLE_NAME || '.updated';
    old_data := to_jsonb(OLD);
    new_data := to_jsonb(NEW);
  ELSIF TG_OP = 'INSERT' THEN
    operation := TG_TABLE_NAME || '.created';
    old_data := NULL;
    new_data := to_jsonb(NEW);
  END IF;

  -- Log the change
  INSERT INTO audit_logs (
    user_id,
    organization_id,
    action,
    resource_type,
    resource_id,
    metadata,
    ip_address
  ) VALUES (
    auth.uid(),
    -- Try to extract organization_id from the record
    CASE
      WHEN TG_TABLE_NAME = 'organizations' THEN
        COALESCE(NEW.id, OLD.id)
      WHEN TG_TABLE_NAME = 'organization_members' THEN
        COALESCE(NEW.organization_id, OLD.organization_id)
      ELSE NULL
    END,
    operation,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    jsonb_build_object(
      'old', old_data,
      'new', new_data,
      'operation', TG_OP
    ),
    inet_client_addr()
  );

  -- For UPDATE and DELETE, return the modified/new row
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ====================================================================
-- PROFILE CRUD FUNCTIONS
-- ====================================================================

-- Get current user profile
CREATE OR REPLACE FUNCTION get_my_profile()
RETURNS SETOF profile_view AS $$
  SELECT * FROM profile_view WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- Get user profile by ID (only if user is member of same org or system admin)
CREATE OR REPLACE FUNCTION get_user_profile(target_user_id UUID)
RETURNS SETOF profile_view AS $$
  SELECT * FROM profile_view
  WHERE id = get_user_profile.target_user_id
    AND (
      -- Can always view own profile
      id = auth.uid()
      OR -- System admins can view any profile
      is_system_admin(auth.uid())
      OR -- Can view if in same organization
      EXISTS (
        SELECT 1 FROM organization_members om1
        JOIN organization_members om2 ON om1.organization_id = om2.organization_id
        WHERE om1.user_id = auth.uid()
          AND om2.user_id = get_user_profile.target_user_id
          AND om1.status = 'active'
          AND om2.status = 'active'
      )
    );
$$ LANGUAGE sql SECURITY DEFINER;

-- Update own profile
CREATE OR REPLACE FUNCTION update_my_profile(
  new_full_name TEXT DEFAULT NULL,
  new_avatar_url TEXT DEFAULT NULL,
  new_metadata JSONB DEFAULT NULL
)
RETURNS SETOF profile_view AS $$
BEGIN
  UPDATE profiles
  SET
    full_name = COALESCE(update_my_profile.new_full_name, full_name),
    avatar_url = COALESCE(update_my_profile.new_avatar_url, avatar_url),
    metadata = COALESCE(update_my_profile.new_metadata, metadata),
    updated_at = NOW()
  WHERE id = auth.uid();

  -- Audit log
  PERFORM audit_action(
    auth.uid(),
    NULL,
    'profile.updated',
    'profile',
    auth.uid(),
    jsonb_build_object(
      'changes', jsonb_strip_nulls(jsonb_build_object(
        'full_name', update_my_profile.new_full_name,
        'avatar_url', update_my_profile.new_avatar_url,
        'metadata', update_my_profile.new_metadata
      ))
    )
  );

  RETURN QUERY SELECT * FROM profile_view WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ====================================================================
-- ORGANIZATION CRUD FUNCTIONS
-- ====================================================================

-- Create new organization
CREATE OR REPLACE FUNCTION create_organization(
  org_name TEXT,
  org_slug TEXT,
  org_description TEXT DEFAULT NULL,
  org_settings JSONB DEFAULT NULL
)
RETURNS SETOF organization_view AS $$
DECLARE
  new_org_id UUID;
  new_member_id UUID;
BEGIN
  -- Validate inputs
  IF org_name IS NULL OR org_name = '' THEN
    RAISE EXCEPTION 'Organization name is required';
  END IF;

  IF org_slug IS NULL OR org_slug = '' THEN
    RAISE EXCEPTION 'Organization slug is required';
  END IF;

  -- Check if slug is already taken
  IF EXISTS (SELECT 1 FROM organizations WHERE slug = org_slug) THEN
    RAISE EXCEPTION 'Organization slug already exists: %', org_slug;
  END IF;

  -- Create organization
  INSERT INTO organizations (name, slug, description, settings)
  VALUES (org_name, org_slug, org_description, COALESCE(org_settings, '{}'::jsonb))
  RETURNING id INTO new_org_id;

  -- Add creator as owner
  INSERT INTO organization_members (organization_id, user_id, role, status, joined_at)
  VALUES (new_org_id, auth.uid(), 'owner', 'active', NOW())
  RETURNING id INTO new_member_id;

  -- Audit log
  PERFORM audit_action(
    auth.uid(),
    new_org_id,
    'organization.created',
    'organization',
    new_org_id,
    jsonb_build_object('name', org_name, 'slug', org_slug)
  );

  -- Return the created organization view
  RETURN QUERY SELECT
    ov.id,
    ov.name,
    ov.slug,
    ov.logo_url,
    ov.description,
    ov.settings,
    ov.created_at,
    ov.updated_at,
    ov.user_id,
    ov.user_role,
    ov.membership_status,
    ov.joined_at
  FROM organization_view ov
  WHERE ov.id = new_org_id AND ov.user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get user's organizations
CREATE OR REPLACE FUNCTION get_my_organizations()
RETURNS SETOF organization_view AS $$
  SELECT
    ov.id,
    ov.name,
    ov.slug,
    ov.logo_url,
    ov.description,
    ov.settings,
    ov.created_at,
    ov.updated_at,
    ov.user_id,
    ov.user_role,
    ov.membership_status,
    ov.joined_at
  FROM organization_view ov
  WHERE ov.user_id = auth.uid()
    AND ov.membership_status = 'active'
  ORDER BY ov.created_at DESC;
$$ LANGUAGE sql SECURITY DEFINER;

-- Get organization by ID (member only)
CREATE OR REPLACE FUNCTION get_organization(target_org_id UUID)
RETURNS SETOF organization_detail_view AS $$
  SELECT * FROM organization_detail_view
  WHERE id = get_organization.target_org_id
    AND is_member(auth.uid(), get_organization.target_org_id);
$$ LANGUAGE sql SECURITY DEFINER;

-- Update organization (admin/owner only)
CREATE OR REPLACE FUNCTION update_organization(
  target_org_id UUID,
  new_name TEXT DEFAULT NULL,
  new_slug TEXT DEFAULT NULL,
  new_description TEXT DEFAULT NULL,
  new_settings JSONB DEFAULT NULL
)
RETURNS SETOF organization_view AS $$
DECLARE
  org_record organizations;
BEGIN
  -- Permission check
  IF NOT is_admin_or_owner(auth.uid(), target_org_id) THEN
    RAISE EXCEPTION 'Permission denied: insufficient permissions';
  END IF;

  -- Check slug uniqueness if changing
  IF new_slug IS NOT NULL AND new_slug != (SELECT slug FROM organizations WHERE id = target_org_id) THEN
    IF EXISTS (SELECT 1 FROM organizations WHERE slug = new_slug AND id != target_org_id) THEN
      RAISE EXCEPTION 'Organization slug already exists: %', new_slug;
    END IF;
  END IF;

  -- Update organization
  UPDATE organizations
  SET
    name = COALESCE(update_organization.new_name, name),
    slug = COALESCE(update_organization.new_slug, slug),
    description = COALESCE(update_organization.new_description, description),
    settings = COALESCE(update_organization.new_settings, settings),
    updated_at = NOW()
  WHERE id = target_org_id
  RETURNING * INTO org_record;

  -- Audit log
  PERFORM audit_action(
    auth.uid(),
    target_org_id,
    'organization.updated',
    'organization',
    target_org_id,
    jsonb_build_object(
      'changes', jsonb_strip_nulls(jsonb_build_object(
        'name', update_organization.new_name,
        'slug', update_organization.new_slug,
        'description', update_organization.new_description,
        'settings', update_organization.new_settings
      ))
    )
  );

  -- Return updated organization view
  RETURN QUERY SELECT
    ov.id,
    ov.name,
    ov.slug,
    ov.logo_url,
    ov.description,
    ov.settings,
    ov.created_at,
    ov.updated_at,
    ov.user_id,
    ov.user_role,
    ov.membership_status,
    ov.joined_at
  FROM organization_view ov
  WHERE ov.id = target_org_id AND ov.user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Delete organization (owner only, hard delete)
CREATE OR REPLACE FUNCTION delete_organization(target_org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Permission check - only owner can delete
  IF NOT EXISTS (
    SELECT 1 FROM organization_members
    WHERE user_id = auth.uid()
      AND organization_id = target_org_id
      AND role = 'owner'
      AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Permission denied: only organization owner can delete organization';
  END IF;

  -- This will cascade delete organization_members due to ON DELETE CASCADE
  DELETE FROM organizations WHERE id = target_org_id;

  -- Audit log
  PERFORM audit_action(
    auth.uid(),
    target_org_id,
    'organization.deleted',
    'organization',
    target_org_id,
    NULL
  );

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ====================================================================
-- ORGANIZATION MEMBER FUNCTIONS
-- ====================================================================

-- Add member to organization (admin/owner only)
CREATE OR REPLACE FUNCTION add_organization_member(
  target_org_id UUID,
  target_user_email TEXT,
  member_role TEXT DEFAULT 'member'
)
RETURNS SETOF member_view AS $$
DECLARE
  target_user_id UUID;
  existing_member organization_members;
BEGIN
  -- Permission check
  IF NOT is_admin_or_owner(auth.uid(), target_org_id) THEN
    RAISE EXCEPTION 'Permission denied: insufficient permissions';
  END IF;

  -- Validate role
  IF member_role NOT IN ('owner', 'admin', 'member', 'viewer') THEN
    RAISE EXCEPTION 'Invalid role: %', member_role;
  END IF;

  -- Find target user
  SELECT id INTO target_user_id
  FROM profiles
  WHERE email = target_user_email;

  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found with email: %', target_user_email;
  END IF;

  -- Check if already member
  SELECT * INTO existing_member
  FROM organization_members
  WHERE organization_id = target_org_id AND user_id = target_user_id;

  IF existing_member IS NOT NULL THEN
    -- Update existing member if they were invited/suspended
    IF existing_member.status IN ('invited', 'suspended') THEN
      UPDATE organization_members
      SET role = member_role, status = 'active', updated_at = NOW()
      WHERE id = existing_member.id;

      -- Audit log
      PERFORM audit_action(
        auth.uid(),
        target_org_id,
        'organization.member_reactivated',
        'organization_member',
        existing_member.id,
        jsonb_build_object('target_user', target_user_id, 'role', member_role)
      );
    ELSE
      RAISE EXCEPTION 'User is already an active member of this organization';
    END IF;
  ELSE
    -- Add new member
    INSERT INTO organization_members (organization_id, user_id, role, status, invited_by)
    VALUES (target_org_id, target_user_id, member_role, 'active', auth.uid());

    -- Audit log
    PERFORM audit_action(
      auth.uid(),
      target_org_id,
      'organization.member_added',
      'organization_member',
      (SELECT id FROM organization_members WHERE organization_id = target_org_id AND user_id = target_user_id),
      jsonb_build_object('target_user', target_user_id, 'role', member_role)
    );
  END IF;

  -- Return member view
  RETURN QUERY SELECT * FROM member_view
  WHERE organization_id = target_org_id AND user_id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remove member from organization (admin/owner only)
CREATE OR REPLACE FUNCTION remove_organization_member(
  target_org_id UUID,
  target_user_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Permission check
  IF NOT is_admin_or_owner(auth.uid(), target_org_id) THEN
    RAISE EXCEPTION 'Permission denied: insufficient permissions';
  END IF;

  -- Can't remove owner
  IF EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = target_org_id
      AND user_id = target_user_id
      AND role = 'owner'
      AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Cannot remove organization owner';
  END IF;

  -- Check if member exists
  IF NOT EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = target_org_id
      AND user_id = target_user_id
  ) THEN
    RAISE EXCEPTION 'User is not a member of this organization';
  END IF;

  -- Remove member
  DELETE FROM organization_members
  WHERE organization_id = target_org_id AND user_id = target_user_id;

  -- Audit log
  PERFORM audit_action(
    auth.uid(),
    target_org_id,
    'organization.member_removed',
    'organization_member',
    target_user_id,
    jsonb_build_object('removed_user', target_user_id)
  );

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get organization members (members can see other members)
CREATE OR REPLACE FUNCTION get_organization_members(target_org_id UUID)
RETURNS SETOF member_view AS $$
  SELECT * FROM member_view
  WHERE organization_id = target_org_id
    AND is_member(auth.uid(), target_org_id)
  ORDER BY
    CASE role
      WHEN 'owner' THEN 1
      WHEN 'admin' THEN 2
      WHEN 'member' THEN 3
      WHEN 'viewer' THEN 4
    END,
    full_name;
$$ LANGUAGE sql SECURITY DEFINER;

-- Update member role (admin/owner only)
CREATE OR REPLACE FUNCTION update_member_role(
  target_org_id UUID,
  target_user_id UUID,
  new_role TEXT
)
RETURNS SETOF member_view AS $$
BEGIN
  -- Permission check
  IF NOT is_admin_or_owner(auth.uid(), target_org_id) THEN
    RAISE EXCEPTION 'Permission denied: insufficient permissions';
  END IF;

  -- Validate role
  IF new_role NOT IN ('owner', 'admin', 'member', 'viewer') THEN
    RAISE EXCEPTION 'Invalid role: %', new_role;
  END IF;

  -- Can't change role of owner unless you are the owner
  IF EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = target_org_id
      AND user_id = target_user_id
      AND role = 'owner'
  ) AND NOT EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = target_org_id
      AND user_id = auth.uid()
      AND role = 'owner'
  ) THEN
    RAISE EXCEPTION 'Cannot modify owner role';
  END IF;

  -- Update member role
  UPDATE organization_members
  SET role = new_role, updated_at = NOW()
  WHERE organization_id = target_org_id AND user_id = target_user_id;

  -- Audit log
  PERFORM audit_action(
    auth.uid(),
    target_org_id,
    'organization.member_role_updated',
    'organization_member',
    target_user_id,
    jsonb_build_object('target_user', target_user_id, 'new_role', new_role)
  );

  -- Return updated member view
  RETURN QUERY SELECT * FROM member_view
  WHERE organization_id = target_org_id AND user_id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ====================================================================
-- AUTH HANDLERS
-- ====================================================================

-- Handle new user creation from auth.users
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create profile
  INSERT INTO profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );

  -- Create default organization (optional - can be skipped for non-SaaS use)
  DECLARE
    default_org_slug TEXT;
    default_org_id UUID;
  BEGIN
    default_org_slug := split_part(NEW.email, '@', 1) || '-' || substr(NEW.id::text, 1, 8);

    -- Create organization
    INSERT INTO organizations (name, slug)
    VALUES (
      COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
      default_org_slug
    )
    RETURNING id INTO default_org_id;

    -- Add user as owner of their default organization
    INSERT INTO organization_members (organization_id, user_id, role, status, joined_at)
    VALUES (default_org_id, NEW.id, 'owner', 'active', NOW());

    -- Audit
    PERFORM audit_action(
      NEW.id,
      default_org_id,
      'user.onboarding_completed',
      'organization',
      default_org_id,
      jsonb_build_object('email', NEW.email, 'auto_created', true)
    );

  EXCEPTION WHEN OTHERS THEN
    -- If org creation fails, still complete user creation
    RAISE WARNING 'Failed to create default organization for user %: %', NEW.id, SQLERRM;
  END;

  -- Audit user creation
  PERFORM audit_action(
    NEW.id,
    NULL,
    'user.created',
    'profile',
    NEW.id,
    jsonb_build_object('email', NEW.email)
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ====================================================================
-- TRIGGERS
-- ====================================================================

-- Trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Auto-audit triggers for important tables
CREATE TRIGGER audit_organizations_changes
  AFTER INSERT OR UPDATE OR DELETE ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION audit_table_changes();

CREATE TRIGGER audit_organization_members_changes
  AFTER INSERT OR UPDATE OR DELETE ON organization_members
  FOR EACH ROW
  EXECUTE FUNCTION audit_table_changes();

-- ====================================================================
-- SELECTIVE RLS POLICIES (For Complex Filtering)
-- ====================================================================

-- For audit logs - users can see their own audit entries
-- Plus org members can see org audit entries (complex filtering scenario)
CREATE POLICY "users_view_own_audit_logs"
ON audit_logs FOR SELECT
USING (
  user_id = auth.uid()
  OR organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid() AND status = 'active'
  )
);

-- ====================================================================
-- INITIAL DATA
-- ====================================================================

-- Insert default system roles
INSERT INTO roles (name, description, permissions, is_system_role) VALUES
  ('admin', 'System administrator with full access', ARRAY['*'], true),
  ('user', 'Regular user with basic access', ARRAY['read:own', 'update:own'], true),
  ('moderator', 'Content moderator with elevated access', ARRAY['read:all', 'update:others'], true);

-- ====================================================================
-- PERFORMANCE OPTIMIZATION
-- ====================================================================

-- Create function to update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add auto-update triggers for tables with updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organization_members_updated_at BEFORE UPDATE ON organization_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ====================================================================
-- MIGRATION COMPLETE
-- ====================================================================
-- This migration establishes a function-first database architecture with:
-- 1. Restrictive RLS (deny all by default)
-- 2. All operations through functions
-- 3. Business logic encapsulated in database
-- 4. Comprehensive audit logging
-- 5. Selective RLS for complex filtering scenarios
-- ====================================================================