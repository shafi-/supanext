-- ====================================================================
-- pgTAP: RLS access-level tests for organization_members, organizations,
--        todos, invites — proves each policy grants exactly the right
--        level of access (no over-exposure, no under-exposure).
-- ====================================================================

BEGIN;
SELECT plan(22);

-- ====================================================================
-- SETUP (as superuser, before SET ROLE)
-- ====================================================================

-- Insert test users. The on_auth_user_created trigger fires and auto-creates
-- profiles + orgs + memberships. Our ON CONFLICT clauses handle the overlap.
-- Profiles are auto-created by the trigger, so profile inserts are no-ops.

-- Test users (ON CONFLICT DO NOTHING for idempotency)
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at) VALUES
  ('11111111-1111-1111-1111-111111111111', 'creator@test.com', '', now()),
  ('22222222-2222-2222-2222-222222222222', 'admin2@test.com', '', now()),
  ('33333333-3333-3333-3333-333333333333', 'member@test.com', '', now()),
  ('44444444-4444-4444-4444-444444444444', 'viewer@test.com', '', now()),
  ('55555555-5555-5555-5555-555555555555', 'outsider@test.com', '', now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO profiles (id, email) VALUES
  ('11111111-1111-1111-1111-111111111111', 'creator@test.com'),
  ('22222222-2222-2222-2222-222222222222', 'admin2@test.com'),
  ('33333333-3333-3333-3333-333333333333', 'member@test.com'),
  ('44444444-4444-4444-4444-444444444444', 'viewer@test.com'),
  ('55555555-5555-5555-5555-555555555555', 'outsider@test.com')
ON CONFLICT (id) DO NOTHING;

-- Test organization
INSERT INTO organizations (id, name, slug) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Test Org', 'test-org')
ON CONFLICT (id) DO NOTHING;

-- Memberships: creator is admin+owner, admin2 is admin (not owner), member and viewer
INSERT INTO organization_members (organization_id, user_id, role, status, is_owner) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'admin',  'active', true),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'admin',  'active', false),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 'member', 'active', false),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '44444444-4444-4444-4444-444444444444', 'viewer', 'active', false)
ON CONFLICT (organization_id, user_id) DO UPDATE SET role = EXCLUDED.role, status = EXCLUDED.status, is_owner = EXCLUDED.is_owner;

-- Test todos
INSERT INTO todos (id, organization_id, title, created_by) VALUES
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Test todo', '11111111-1111-1111-1111-111111111111')
ON CONFLICT (id) DO NOTHING;

-- Test invites
INSERT INTO invites (id, organization_id, email, invited_by) VALUES
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'newuser@test.com', '11111111-1111-1111-1111-111111111111')
ON CONFLICT (id) DO NOTHING;

-- ====================================================================
-- TEST 1-3: Non-member sees NOTHING (outsider)
-- ====================================================================

SELECT set_config('request.jwt.claims', '{"sub":"55555555-5555-5555-5555-555555555555","role":"authenticated"}', true);
SET ROLE authenticated;

SELECT is(
  (SELECT count(*) FROM organization_members WHERE organization_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  0::bigint,
  'Outsider sees 0 members (RLS blocks all)'
);

SELECT is(
  (SELECT count(*) FROM organizations WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  0::bigint,
  'Outsider sees 0 organizations (RLS blocks)'
);

SELECT is(
  (SELECT count(*) FROM todos WHERE organization_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  0::bigint,
  'Outsider sees 0 todos (RLS blocks)'
);

RESET ROLE;

-- ====================================================================
-- TEST 4-6: Member sees full member list (has members:read)
-- ====================================================================

SELECT set_config('request.jwt.claims', '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}', true);
SET ROLE authenticated;

SELECT lives_ok(
  $$SELECT * FROM organization_members WHERE organization_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'$$,
  'Member can query organization_members without recursion'
);

SELECT is(
  (SELECT count(*) FROM organization_members WHERE organization_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  4::bigint,
  'Member sees all 4 members (has members:read permission)'
);

SELECT is(
  (SELECT count(*) FROM todos WHERE organization_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  1::bigint,
  'Member sees todos (has todos:read permission)'
);

RESET ROLE;

-- ====================================================================
-- TEST 7-9: Viewer sees read-only data
-- ====================================================================

SELECT set_config('request.jwt.claims', '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}', true);
SET ROLE authenticated;

SELECT is(
  (SELECT count(*) FROM organization_members WHERE organization_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  4::bigint,
  'Viewer sees all members (has members:read permission)'
);

SELECT is(
  (SELECT count(*) FROM todos WHERE organization_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  1::bigint,
  'Viewer sees todos (has todos:read permission)'
);

SELECT is(
  (SELECT count(*) FROM invites WHERE organization_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  0::bigint,
  'Viewer sees 0 invites (no invites:read permission)'
);

RESET ROLE;

-- ====================================================================
-- TEST 10-14: Admin (not owner) has admin perms, NOT owner perms
-- ====================================================================

SELECT set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
SET ROLE authenticated;

SELECT is(
  can_perform('org:update', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  true,
  'Admin can update org (has org:update permission)'
);

SELECT is(
  can_perform('org:delete', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  true,
  'Admin can delete org (has org:delete permission)'
);

SELECT is(
  can_perform('members:create', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  true,
  'Admin can create members (has members:create permission)'
);

SELECT is(
  can_perform('subscription:manage', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  false,
  'Admin CANNOT manage subscription (no subscription:manage permission)'
);

SELECT is(
  can_perform('subscription:read', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  false,
  'Admin CANNOT read subscription (no subscription:read permission)'
);

RESET ROLE;

-- ====================================================================
-- TEST 15-18: Owner (admin+is_owner) has ALL perms including subscription
-- ====================================================================

SELECT set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
SET ROLE authenticated;

SELECT is(
  can_perform('org:update', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  true,
  'Owner can update org (is_owner short-circuit)'
);

SELECT is(
  can_perform('subscription:manage', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  true,
  'Owner CAN manage subscription (is_owner short-circuit)'
);

SELECT is(
  can_perform('subscription:read', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  true,
  'Owner CAN read subscription (is_owner short-circuit)'
);

SELECT is(
  can_perform('todos:delete', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  true,
  'Owner can delete todos (admin has todos:delete permission)'
);

RESET ROLE;

-- ====================================================================
-- TEST 19-20: Member CANNOT do admin actions
-- ====================================================================

SELECT set_config('request.jwt.claims', '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}', true);
SET ROLE authenticated;

SELECT is(
  can_perform('org:update', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  false,
  'Member CANNOT update org (no org:update permission)'
);

SELECT is(
  can_perform('members:create', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  false,
  'Member CANNOT create members (no members:create permission)'
);

RESET ROLE;

-- ====================================================================
-- TEST 21-22: Outsider can_perform returns false for everything
-- ====================================================================

SELECT set_config('request.jwt.claims', '{"sub":"55555555-5555-5555-5555-555555555555","role":"authenticated"}', true);
SET ROLE authenticated;

SELECT is(
  can_perform('org:read', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  false,
  'Outsider can_perform org:read returns false (not a member)'
);

SELECT is(
  can_perform('todos:read', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  false,
  'Outsider can_perform todos:read returns false (not a member)'
);

RESET ROLE;

-- ====================================================================
ROLLBACK;
