-- ====================================================================
-- SECURITY HARDENING
-- ====================================================================
-- Fixes identified in security audit:
--   S1. set_system_admin() was EXECUTE-granted to authenticated
--       -> any logged-in user could self-promote to system admin.
--       Now: removed from the migration chain entirely — dev-only file.
--   S2. Dev helpers reset_development_data()/create_test_user() had the
--       default PUBLIC execute grant -> anyone (even anon) could wipe data.
--       Now: removed from the migration chain entirely — dev-only file.
--   S3. Views (profile_view, organization_view, organization_detail_view,
--       member_view) run with owner privileges and were SELECT-granted to
--       authenticated -> any logged-in user could read ALL profiles,
--       ALL orgs and ALL members across tenants. Access now goes through
--       the guarded RPC functions only.
--   S4. grant/revoke_system_admin were SECURITY INVOKER while profiles has
--       no UPDATE policy -> UPDATE matched 0 rows ("User not found").
--       System admin could never grant another admin. Now SECURITY DEFINER
--       with explicit is_system_admin guard inside.
--   S5. get_system_admins() same INVOKER/RLS bug -> always returned empty.
--       Now SECURITY DEFINER with internal guard.
--   S6. get_organization_subscriptions()/get_subscription_history()/
--       get_subscription_plans()/has_feature() are SECURITY DEFINER with
--       no authorization check -> any authenticated user could read every
--       org's billing data. Guards added.
--   S7. get_user_profile(target_user_id) returned ANY profile (email PII)
--       to any authenticated user. Now: self or co-members of an active
--       shared organization only.
--   S8. accept_invite() did not verify the invitee's email matches the
--       invited address. Now enforced.
--   S9. validate_invite() granted to anon so the pre-auth invite landing
--       page works.
--   S10. audit_action() returned id via ORDER BY created_at DESC LIMIT 1
--       (racy under concurrency). Uses RETURNING now.
--   S11. handle_new_user() swallowed profile-creation failures, producing
--       users without a profile/org. Profile failure now aborts; default
--       org creation remains best-effort.
--   S12. organization_subscriptions.billing_period accepted any text.
--       CHECK constraint added.
-- ====================================================================

-- NOTE on S1/S2 (set_system_admin / reset_development_data /
-- create_test_user): these destructive helpers are NOT defined in any
-- migration — they live in supabase/dev_helpers.sql and must be applied
-- manually to LOCAL DEV ONLY. Production databases never contain them.

GRANT EXECUTE ON FUNCTION validate_invite(TEXT) TO anon;

-- --------------------------------------------------------------------
-- S3: close direct view access (views stay owner-semantics; they are
-- internal plumbing behind guarded functions)
-- --------------------------------------------------------------------

REVOKE SELECT ON profile_view FROM authenticated;
REVOKE SELECT ON organization_view FROM authenticated;
REVOKE SELECT ON organization_detail_view FROM authenticated;
REVOKE SELECT ON member_view FROM authenticated;
REVOKE SELECT ON role_view FROM authenticated;

-- --------------------------------------------------------------------
-- S4/S5: working system-admin management (definer + internal guard)
-- System admin is a GLOBAL role (profiles.is_system_admin) and is never
-- consulted by org-level can_perform() checks — org authorization stays
-- purely membership-based.
-- --------------------------------------------------------------------

CREATE OR REPLACE FUNCTION grant_system_admin(target_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  IF NOT is_system_admin() THEN
    RAISE EXCEPTION 'Not authorized: system admin required';
  END IF;

  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'You are already a system admin';
  END IF;

  UPDATE profiles SET is_system_admin = true WHERE id = target_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'User not found'; END IF;
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION get_system_admins()
RETURNS SETOF profile_view AS $$
BEGIN
  IF NOT is_system_admin() THEN
    RAISE EXCEPTION 'Not authorized: system admin required';
  END IF;

  RETURN QUERY SELECT * FROM profile_view WHERE id IN (
    SELECT id FROM profiles WHERE is_system_admin = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION grant_system_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION revoke_system_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_system_admins() TO authenticated;

-- --------------------------------------------------------------------
-- S6: subscription function guards
-- --------------------------------------------------------------------

-- Plans: active plans for everyone, full list for system admins only.
-- Drop the old unguarded zero-arg version first.
DROP FUNCTION IF EXISTS get_subscription_plans();

CREATE OR REPLACE FUNCTION get_subscription_plans(p_include_inactive BOOLEAN DEFAULT false)
RETURNS SETOF subscription_plans AS $$
  SELECT * FROM subscription_plans
  WHERE (p_include_inactive = false AND is_active = true)
     OR (p_include_inactive = true AND is_system_admin())
  ORDER BY price_monthly ASC, price_yearly ASC;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- All-org subscription list: system admin only.
CREATE OR REPLACE FUNCTION get_organization_subscriptions()
RETURNS TABLE(
  id UUID,
  organization_id UUID,
  org_name TEXT,
  plan_name TEXT,
  status TEXT,
  billing_period TEXT,
  price_monthly NUMERIC,
  price_yearly NUMERIC,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  IF NOT is_system_admin() THEN
    RAISE EXCEPTION 'Not authorized: system admin required';
  END IF;

  RETURN QUERY
  SELECT
    os.id,
    os.organization_id,
    o.name AS org_name,
    sp.name AS plan_name,
    os.status,
    os.billing_period,
    sp.price_monthly,
    sp.price_yearly,
    os.current_period_start,
    os.current_period_end,
    os.created_at
  FROM organization_subscriptions os
  JOIN organizations o ON os.organization_id = o.id
  JOIN subscription_plans sp ON os.plan_id = sp.id
  ORDER BY os.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Org billing history: active members of that org or system admins.
CREATE OR REPLACE FUNCTION get_subscription_history(p_org_id UUID)
RETURNS TABLE(
  id UUID,
  organization_id UUID,
  org_name TEXT,
  plan_name TEXT,
  action TEXT,
  amount NUMERIC,
  payment_status TEXT,
  invoice_number TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  IF NOT is_system_admin()
     AND NOT EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = p_org_id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
    ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  SELECT
    sh.id,
    sh.organization_id,
    o.name AS org_name,
    sp.name AS plan_name,
    sh.action,
    sh.amount,
    sh.payment_status,
    sh.invoice_number,
    sh.notes,
    sh.created_at
  FROM subscription_history sh
  JOIN organizations o ON sh.organization_id = o.id
  JOIN subscription_plans sp ON sh.plan_id = sp.id
  WHERE sh.organization_id = p_org_id
  ORDER BY sh.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Feature probing requires membership of that org (or system admin).
-- Inner helper holds the original plan-feature lookup.
CREATE OR REPLACE FUNCTION has_feature_inner(p_org_id UUID, p_feature TEXT)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM organization_subscriptions os
    JOIN subscription_plans sp ON os.plan_id = sp.id
    WHERE os.organization_id = p_org_id
      AND os.status = 'active'
      AND sp.is_active = true
      AND os.current_period_end > NOW()
      AND sp.features ? p_feature
  );
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION has_feature(p_org_id UUID, p_feature TEXT)
RETURNS BOOLEAN AS $$
  SELECT CASE
    WHEN NOT EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = p_org_id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
    ) AND NOT is_system_admin() THEN false
    ELSE has_feature_inner(p_org_id, p_feature)
  END;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION get_subscription_plans(BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION get_organization_subscriptions() TO authenticated;
GRANT EXECUTE ON FUNCTION get_subscription_history(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION has_feature(UUID, TEXT) TO authenticated;

-- S12: constrain billing period values.
ALTER TABLE organization_subscriptions
  DROP CONSTRAINT IF EXISTS organization_subscriptions_billing_period_check;
ALTER TABLE organization_subscriptions
  ADD CONSTRAINT organization_subscriptions_billing_period_check
  CHECK (billing_period IN ('monthly', 'yearly'));

-- --------------------------------------------------------------------
-- S7: profile PII — self or active co-member only
-- --------------------------------------------------------------------

CREATE OR REPLACE FUNCTION get_user_profile(target_user_id UUID)
RETURNS SETOF profile_view AS $$
  SELECT * FROM profile_view
  WHERE id = target_user_id
    AND (
      id = auth.uid()
      OR EXISTS (
        SELECT 1
        FROM organization_members mine
        JOIN organization_members theirs
          ON theirs.organization_id = mine.organization_id
         AND theirs.user_id = get_user_profile.target_user_id
        WHERE mine.user_id = auth.uid()
          AND mine.status = 'active'
          AND theirs.status = 'active'
      )
    );
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION get_user_profile(UUID) TO authenticated;

-- --------------------------------------------------------------------
-- S8: accept_invite enforces invited-email match
-- --------------------------------------------------------------------

CREATE OR REPLACE FUNCTION accept_invite(p_token TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_invite invites;
  v_user_email TEXT;
BEGIN
  SELECT * INTO v_invite FROM invites
  WHERE token = p_token AND accepted_at IS NULL AND expires_at > NOW();

  IF v_invite IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired invite';
  END IF;

  SELECT email INTO v_user_email FROM profiles WHERE id = auth.uid();

  IF lower(COALESCE(v_user_email, '')) <> lower(v_invite.email) THEN
    RAISE EXCEPTION 'This invite was issued to a different email address';
  END IF;

  INSERT INTO organization_members (organization_id, user_id, role, status, invited_by)
  VALUES (v_invite.organization_id, auth.uid(), v_invite.role, 'active', v_invite.invited_by)
  ON CONFLICT (organization_id, user_id) DO NOTHING;

  UPDATE invites SET accepted_at = NOW() WHERE id = v_invite.id;
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION accept_invite(TEXT) TO authenticated;

-- --------------------------------------------------------------------
-- S10: race-free audit_action
-- --------------------------------------------------------------------

CREATE OR REPLACE FUNCTION audit_action(
  audit_user_id UUID,
  audit_org_id UUID,
  action_name TEXT,
  p_resource_type TEXT DEFAULT NULL,
  p_resource_id UUID DEFAULT NULL,
  audit_metadata JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO public.audit_logs (
    user_id, organization_id, action, resource_type, resource_id, metadata, ip_address, user_agent
  ) VALUES (
    audit_user_id, audit_org_id, action_name, p_resource_type, p_resource_id, audit_metadata,
    inet_client_addr(),
    COALESCE(current_setting('request.headers', true)::json->>'user-agent', 'unknown')
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- --------------------------------------------------------------------
-- S11: handle_new_user — profile creation must succeed; default org is
-- best-effort but failures are visible
-- --------------------------------------------------------------------

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  default_org_slug TEXT;
  default_org_id UUID;
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));

  BEGIN
    default_org_slug := split_part(NEW.email, '@', 1) || '-' || substr(replace(NEW.id::text, '-', ''), 1, 8);

    INSERT INTO public.organizations (name, slug)
    VALUES (COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name', ''), split_part(NEW.email, '@', 1)), default_org_slug)
    ON CONFLICT (slug) DO NOTHING
    RETURNING id INTO default_org_id;

    IF default_org_id IS NULL THEN
      -- Slug collision retry with fuller uuid suffix
      default_org_slug := split_part(NEW.email, '@', 1) || '-' || substr(replace(NEW.id::text, '-', ''), 1, 16);
      INSERT INTO public.organizations (name, slug)
      VALUES (COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name', ''), split_part(NEW.email, '@', 1)), default_org_slug)
      RETURNING id INTO default_org_id;
    END IF;

    INSERT INTO public.organization_members (organization_id, user_id, role, status, is_owner, joined_at)
    VALUES (default_org_id, NEW.id, 'admin', 'active', true, NOW());

    PERFORM public.audit_action(NEW.id, default_org_id, 'user.onboarding_completed', 'organization', default_org_id,
      jsonb_build_object('email', NEW.email, 'auto_created', true));
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'SupaNext: default org provisioning failed for user %: %', NEW.id, SQLERRM;
    PERFORM public.audit_action(NEW.id, NULL, 'user.onboarding_failed', 'profile', NEW.id,
      jsonb_build_object('error', SQLERRM));
  END;

  PERFORM public.audit_action(NEW.id, NULL, 'user.created', 'profile', NEW.id,
    jsonb_build_object('email', NEW.email));

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Profile insert failed: surface loudly instead of creating a ghost user.
  RAISE WARNING 'SupaNext: profile creation failed for user %: %', NEW.id, SQLERRM;
  RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- --------------------------------------------------------------------
-- S13: bootstrap_system_admin — race-free first-admin claim
-- --------------------------------------------------------------------
-- Invariants:
--   1. Succeeds ONLY when the system has zero system admins.
--   2. Once any admin exists, new admins are created exclusively via
--      grant_system_admin() by an existing admin (or set_system_admin()
--      by service_role for CLI provisioning).
--   3. No self-promotion: a transaction advisory lock serializes
--      concurrent claims, so exactly one caller can win even under
--      simultaneous requests (the old EXISTS-then-UPDATE had a TOCTOU
--      race allowing two concurrent users to both become admin).
--   4. Zero-admin state is unreachable after the first claim:
--      revoke_system_admin() blocks self-revocation and requires an
--      existing admin, so the bootstrap window never reopens.

CREATE OR REPLACE FUNCTION bootstrap_system_admin()
RETURNS BOOLEAN AS $$
DECLARE
  v_admin_count BIGINT;
BEGIN
  -- Serialize concurrent bootstrap attempts across all transactions.
  PERFORM pg_advisory_xact_lock(hashtext('supanext:bootstrap_system_admin'));

  SELECT COUNT(*) INTO v_admin_count FROM profiles WHERE is_system_admin = true;

  IF v_admin_count > 0 THEN
    RAISE EXCEPTION 'System admin already exists. New system admins must be granted by an existing system admin.';
  END IF;

  UPDATE profiles SET is_system_admin = true WHERE id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'No profile found for current user'; END IF;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION bootstrap_system_admin() TO authenticated;

-- --------------------------------------------------------------------
-- Final lockdown: strip default PUBLIC execute everywhere (functions
-- recreated above regain the default grant at creation time), then
-- declare the complete callable API surface explicitly.
-- This block is the single source of truth for RPC exposure.
-- --------------------------------------------------------------------

REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA private FROM PUBLIC;

-- RLS policies run helper functions as the calling role — authenticated
-- needs EXECUTE on the private schema helpers used inside policies.
GRANT EXECUTE ON FUNCTION private.get_user_org_ids() TO authenticated;

-- Anon surface (pre-auth flows only)
GRANT EXECUTE ON FUNCTION validate_invite(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_public_org_by_slug(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_public_org_by_slug(TEXT) TO authenticated;

-- Authenticated surface
GRANT EXECUTE ON FUNCTION
  can_perform(TEXT, UUID),
  is_system_admin(),
  get_my_profile(),
  get_user_profile(UUID),
  update_my_profile(TEXT, TEXT, JSONB),
  create_organization(TEXT, TEXT, TEXT, JSONB),
  get_my_organizations(),
  get_organization(UUID),
  update_organization(UUID, TEXT, TEXT, TEXT, JSONB),
  delete_organization(UUID),
  add_organization_member(UUID, TEXT, TEXT),
  remove_organization_member(UUID, UUID),
  get_organization_members(UUID),
  update_member_role(UUID, UUID, TEXT),
  get_membership(UUID),
  create_todo(UUID, TEXT, TEXT),
  get_todos(UUID),
  update_todo(UUID, TEXT, TEXT, BOOLEAN),
  delete_todo(UUID),
  create_invite(UUID, TEXT, TEXT),
  get_invites(UUID),
  accept_invite(TEXT),
  revoke_invite(UUID),
  get_system_stats(),
  get_all_organizations(),
  grant_system_admin(UUID),
  revoke_system_admin(UUID),
  get_system_admins(),
  bootstrap_system_admin(),
  get_subscription_plans(BOOLEAN),
  create_subscription_plan(TEXT, TEXT, NUMERIC, NUMERIC, JSONB),
  update_subscription_plan(UUID, TEXT, TEXT, NUMERIC, NUMERIC, JSONB, BOOLEAN),
  get_organization_subscriptions(),
  get_subscription_history(UUID),
  pause_subscription(UUID),
  unpause_subscription(UUID),
  subscribe_to_plan(UUID, UUID, TEXT),
  change_plan(UUID, UUID, TEXT),
  cancel_subscription(UUID),
  get_my_subscription(UUID),
  has_feature(UUID, TEXT)
TO authenticated;
-- NOTE: set_system_admin / reset_development_data / create_test_user are
-- dev-only (supabase/dev_helpers.sql). They are deliberately absent here —
-- production must never contain them.

-- pgTAP for supabase/tests/database/*.sql. Installed LAST so the schema-wide
-- REVOKE above never strips its internals; test-only surface anyway.
CREATE EXTENSION IF NOT EXISTS pgtap;
