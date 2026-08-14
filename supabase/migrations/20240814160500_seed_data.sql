-- ====================================================================
-- Seed Data Migration
-- ====================================================================
-- This migration adds initial seed data for development and testing
-- ====================================================================

-- Insert additional role definitions
INSERT INTO roles (name, description, permissions, is_system_role) VALUES
  ('owner', 'Organization owner with full access to organization resources', ARRAY['*'], false),
  ('admin', 'Organization administrator with elevated access', ARRAY['create', 'read', 'update', 'delete'], false),
  ('member', 'Organization member with standard access', ARRAY['read', 'update:own'], false),
  ('viewer', 'Organization viewer with read-only access', ARRAY['read'], false)
ON CONFLICT (name) DO NOTHING;

-- ====================================================================
-- Demo Data for Development (Optional)
-- ====================================================================

-- Note: This section is for development purposes only.
-- In production, users and organizations should be created through the application.

-- Example: Create demo organizations and users for testing
-- Uncomment and modify as needed for your development environment:

/*
-- Demo organization 1
INSERT INTO organizations (name, slug, description, settings)
VALUES (
  'Acme Corporation',
  'acme-corp',
  'A demo organization for testing',
  '{"theme": "light", "timezone": "UTC"}'::jsonb
);

-- Demo organization 2
INSERT INTO organizations (name, slug, description, settings)
VALUES (
  'Tech Startup Inc',
  'tech-startup',
  'Another demo organization',
  '{"theme": "dark", "timezone": "America/New_York"}'::jsonb
);

-- Note: Users cannot be created here as they must be created through auth.users
-- Organizations will be associated with users when users sign up
*/

-- ====================================================================
-- Development Helper Functions
-- ====================================================================

-- Function to reset database for development (use with caution!)
CREATE OR REPLACE FUNCTION reset_development_data()
RETURNS void AS $$
BEGIN
  -- This function is for development only
  -- It removes all data while preserving schema
  -- WARNING: Do not use in production!

  RAISE NOTICE 'Resetting development data...';

  -- Delete from all tables in correct order
  DELETE FROM audit_logs;
  DELETE FROM organization_members;
  DELETE FROM organizations;
  DELETE FROM profiles;
  DELETE FROM roles;

  -- Re-insert default roles
  INSERT INTO roles (name, description, permissions, is_system_role) VALUES
    ('admin', 'System administrator with full access', ARRAY['*'], true),
    ('user', 'Regular user with basic access', ARRAY['read:own', 'update:own'], true),
    ('moderator', 'Content moderator with elevated access', ARRAY['read:all', 'update:others'], true);

  RAISE NOTICE 'Development data reset completed';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ====================================================================
-- Testing Helper Functions
-- ====================================================================

-- Function to create test user and organization for development
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
  -- This is a development/testing function only
  -- In production, users must be created through auth

  -- Generate test user ID
  test_user_id := gen_random_uuid();

  -- Insert test profile (bypassing auth for testing)
  INSERT INTO profiles (id, email, full_name)
  VALUES (test_user_id, test_email, test_full_name);

  -- Create test organization
  INSERT INTO organizations (name, slug)
  VALUES (
    test_org_name,
    lower(regexp_replace(test_org_name, '[^a-zA-Z0-9]+', '-', 'g'))
  )
  RETURNING id INTO test_org_id;

  -- Add user as owner
  INSERT INTO organization_members (organization_id, user_id, role, status, joined_at)
  VALUES (test_org_id, test_user_id, 'owner', 'active', NOW());

  RETURN test_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ====================================================================
-- MIGRATION COMPLETE
-- ====================================================================
-- This migration adds seed data and helper functions for development
-- ====================================================================