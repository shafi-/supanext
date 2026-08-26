-- ====================================================================
-- pgTAP: System admin invariants
--   1. bootstrap_system_admin() succeeds ONLY when zero admins exist
--      (race-free — advisory lock serializes concurrent claims)
--   2. Once an admin exists, bootstrap() always fails
--   3. Non-admins cannot grant/revoke system admin
--   4. Existing admins can grant new admins
--   5. Self-revocation blocked; zero-admin state unreachable
--   6. Authenticated users cannot flip their own is_system_admin flag
--      through ANY unprivileged path (column privilege — the UPDATE
--      itself raises permission denied)
--   7. Own-row profile edits are limited to granted columns
--      (full_name/avatar_url/metadata); email and timestamps immutable
-- ====================================================================

BEGIN;
SELECT plan(15);

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

-- ====================================================================
-- TEST 1: First claim succeeds when zero admins exist
-- ====================================================================

SELECT is(
  (SELECT COUNT(*) FROM profiles WHERE is_system_admin = true),
  0::bigint,
  'Precondition: zero system admins'
);

SELECT set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
SET ROLE authenticated;

SELECT is(
  bootstrap_system_admin(),
  true,
  'First bootstrap succeeds when no system admin exists'
);

RESET ROLE;

-- ====================================================================
-- TEST 2-4: Second claim fails; non-admin cannot self-promote
-- ====================================================================

SELECT is(
  (SELECT COUNT(*) FROM profiles WHERE is_system_admin = true),
  1::bigint,
  'Exactly one system admin after first claim'
);

SELECT set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
SET ROLE authenticated;

SELECT throws_ok(
  $$SELECT bootstrap_system_admin()$$,
  NULL,
  'System admin already exists. New system admins must be granted by an existing system admin.',
  'Bootstrap fails once any system admin exists'
);

SELECT throws_ok(
  $$SELECT grant_system_admin('22222222-2222-2222-2222-222222222222')$$,
  NULL,
  'Not authorized: system admin required',
  'Non-admin CANNOT grant themselves system admin'
);

SELECT throws_ok(
  $$SELECT revoke_system_admin('11111111-1111-1111-1111-111111111111')$$,
  NULL,
  'Not authorized: system admin required',
  'Non-admin CANNOT revoke a system admin'
);

RESET ROLE;

-- ====================================================================
-- TEST 5-7: Existing admin manages other admins
-- ====================================================================

SELECT set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
SET ROLE authenticated;

SELECT is(
  grant_system_admin('22222222-2222-2222-2222-222222222222'),
  true,
  'Existing admin CAN grant another system admin'
);

SELECT throws_ok(
  $$SELECT revoke_system_admin('11111111-1111-1111-1111-111111111111')$$,
  NULL,
  'Cannot revoke your own system admin status',
  'Self-revocation blocked (keeps bootstrap window closed)'
);

SELECT is(
  revoke_system_admin('22222222-2222-2222-2222-222222222222'),
  true,
  'Admin CAN revoke another system admin'
);

RESET ROLE;

-- ====================================================================
-- TEST 8: Zero-admin state unreachable after first claim
-- ====================================================================

SELECT is(
  (SELECT COUNT(*) FROM profiles WHERE is_system_admin = true),
  1::bigint,
  'Still exactly one admin after grant+revoke cycle'
);

-- ====================================================================
-- TEST 9: Direct escalation impossible — flag column not writable,
--         safe own-row edits allowed, email immutable
-- ====================================================================

SELECT set_config('request.jwt.claims', '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}', true);
SET ROLE authenticated;

SELECT throws_ok(
  $$UPDATE profiles SET is_system_admin = true WHERE id = auth.uid()$$,
  NULL,
  NULL,
  'UPDATE on profiles.is_system_admin denied (column privilege)'
);

UPDATE profiles SET full_name = 'Member Renamed' WHERE id = auth.uid();

SELECT is(
  (SELECT full_name FROM profiles WHERE id = auth.uid()),
  'Member Renamed',
  'Own-row edit of granted column succeeds'
);

SELECT throws_ok(
  $$UPDATE profiles SET email = 'hijacked@test.com' WHERE id = auth.uid()$$,
  NULL,
  NULL,
  'UPDATE on profiles.email denied (column privilege)'
);

RESET ROLE;

-- ====================================================================
-- TEST 10: System admin is global, not org-scoped — can_perform ignores it
-- ====================================================================

INSERT INTO organizations (id, name, slug)
VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Test Org', 'test-org')
ON CONFLICT (id) DO NOTHING;

SELECT set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
SET ROLE authenticated;

SELECT is(
  can_perform('todos:create', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  false,
  'System admin gets NO org permissions without org membership'
);

RESET ROLE;

-- ====================================================================
-- TEST 11: set_system_admin must NOT exist (dev-only helper)
-- ====================================================================

SELECT is(
  to_regprocedure('public.set_system_admin(uuid)') IS NULL,
  true,
  'set_system_admin absent from schema (dev_helpers.sql only)'
);

RESET ROLE;

-- ====================================================================
ROLLBACK;
