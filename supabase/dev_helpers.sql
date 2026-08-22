-- ====================================================================
-- DEV HELPERS — LOCAL DEVELOPMENT ONLY. NEVER APPLY TO PRODUCTION.
-- ====================================================================
-- These functions bypass authorization by design:
--   set_system_admin(user_id)      promote anyone to global system admin
--   reset_development_data()       wipe all application data
--   create_test_user(email, ...)   fabricate user + org + membership
--
-- They are intentionally NOT part of supabase/migrations/ so `supabase
-- db push` can never ship them to a remote/production database. The only
-- supported way to install them is scripts/bootstrap-admin.sh, which
-- hard-refuses to run against anything but localhost.
--
-- Manual apply (local dev only):
--   docker exec -i supabase_db_<project> psql -U postgres -d postgres \
--     -f - < supabase/dev_helpers.sql
-- ====================================================================

CREATE OR REPLACE FUNCTION set_system_admin(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE profiles SET is_system_admin = true WHERE id = p_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'User not found'; END IF;
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION reset_development_data()
RETURNS void AS $$
BEGIN
  RAISE NOTICE 'Resetting development data...';
  DELETE FROM audit_logs;
  DELETE FROM subscription_history;
  DELETE FROM organization_subscriptions;
  DELETE FROM subscription_plans;
  DELETE FROM invites;
  DELETE FROM todos;
  DELETE FROM organization_members;
  DELETE FROM organizations;
  DELETE FROM profiles;
  DELETE FROM role_permissions;
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
  VALUES (test_org_name, lower(regexp_replace(test_org_name, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substr(replace(test_user_id::text, '-', ''), 1, 8))
  RETURNING id INTO test_org_id;
  INSERT INTO organization_members (organization_id, user_id, role, status, is_owner, joined_at)
  VALUES (test_org_id, test_user_id, 'admin', 'active', true, NOW());
  RETURN test_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Lock to service_role so even local anon/authenticated roles cannot call
-- them through the API gateway.
REVOKE EXECUTE ON FUNCTION set_system_admin(UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION reset_development_data() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION create_test_user(TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION set_system_admin(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION reset_development_data() TO service_role;
GRANT EXECUTE ON FUNCTION create_test_user(TEXT, TEXT, TEXT) TO service_role;
