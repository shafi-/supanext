-- ====================================================================
-- pgTAP: Subscription RLS — proves owner-only access for subscription
--        management (subscribe, change, cancel, view).
-- ====================================================================

BEGIN;
SELECT plan(8);

-- ====================================================================
-- SETUP
-- ====================================================================

INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at) VALUES
  ('11111111-1111-1111-1111-111111111111', 'creator@test.com', '', now()),
  ('22222222-2222-2222-2222-222222222222', 'admin2@test.com', '', now()),
  ('33333333-3333-3333-3333-333333333333', 'member@test.com', '', now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO profiles (id, email) VALUES
  ('11111111-1111-1111-1111-111111111111', 'creator@test.com'),
  ('22222222-2222-2222-2222-222222222222', 'admin2@test.com'),
  ('33333333-3333-3333-3333-333333333333', 'member@test.com')
ON CONFLICT (id) DO NOTHING;

INSERT INTO organizations (id, name, slug) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Test Org', 'test-org')
ON CONFLICT (id) DO NOTHING;

INSERT INTO organization_members (organization_id, user_id, role, status, is_owner) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'admin',  'active', true),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'admin',  'active', false),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 'member', 'active', false)
ON CONFLICT (organization_id, user_id) DO UPDATE SET role = EXCLUDED.role, status = EXCLUDED.status, is_owner = EXCLUDED.is_owner;

-- Subscription plan
INSERT INTO subscription_plans (id, name, price_monthly, is_active) VALUES
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'Pro Plan', 29.99, true)
ON CONFLICT (id) DO NOTHING;

-- ====================================================================
-- TEST 1-2: Owner can manage subscriptions
-- ====================================================================

SELECT set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
SET ROLE authenticated;

SELECT is(
  can_perform('subscription:manage', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  true,
  'Owner can manage subscription (is_owner short-circuit)'
);

SELECT lives_ok(
  $$INSERT INTO organization_subscriptions (organization_id, plan_id, status, billing_period, current_period_end)
    VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'active', 'monthly', now() + interval '1 month')$$,
  'Owner can insert subscription (RLS allows)'
);

RESET ROLE;

-- ====================================================================
-- TEST 3-4: Admin (not owner) CANNOT manage subscriptions
-- ====================================================================

SELECT set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
SET ROLE authenticated;

SELECT is(
  can_perform('subscription:manage', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  false,
  'Admin (not owner) CANNOT manage subscription'
);

SELECT throws_ok(
  $$INSERT INTO organization_subscriptions (organization_id, plan_id, status, billing_period, current_period_end)
    VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'active', 'monthly', now() + interval '1 month')$$,
  42501,
  'new row violates row-level security policy for table "organization_subscriptions"',
  'Admin (not owner) INSERT blocked by RLS'
);

RESET ROLE;

-- ====================================================================
-- TEST 5-6: Member CANNOT manage subscriptions
-- ====================================================================

SELECT set_config('request.jwt.claims', '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}', true);
SET ROLE authenticated;

SELECT is(
  can_perform('subscription:manage', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  false,
  'Member CANNOT manage subscription'
);

SELECT throws_ok(
  $$INSERT INTO organization_subscriptions (organization_id, plan_id, status, billing_period, current_period_end)
    VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'active', 'monthly', now() + interval '1 month')$$,
  42501,
  'new row violates row-level security policy for table "organization_subscriptions"',
  'Member INSERT blocked by RLS'
);

RESET ROLE;

-- ====================================================================
-- TEST 7-8: Subscription history — members can read, only owner can write
-- ====================================================================

-- Insert history as owner (superuser bypass for setup)
INSERT INTO subscription_history (organization_id, plan_id, action, amount) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'subscribed', 29.99);

-- Member can read subscription history
SELECT set_config('request.jwt.claims', '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}', true);
SET ROLE authenticated;

SELECT is(
  (SELECT count(*) FROM subscription_history WHERE organization_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  1::bigint,
  'Member can read subscription history (active member)'
);

RESET ROLE;

-- Non-owner cannot INSERT subscription history
SELECT set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
SET ROLE authenticated;

SELECT throws_ok(
  $$INSERT INTO subscription_history (organization_id, plan_id, action, amount)
    VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'subscribed', 29.99)$$,
  42501,
  'new row violates row-level security policy for table "subscription_history"',
  'Non-owner cannot INSERT subscription history'
);

RESET ROLE;

-- ====================================================================
ROLLBACK;
