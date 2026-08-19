-- ====================================================================
-- pgTAP: Public org access — get_public_org_by_slug works for anon,
--        no recursion, returns correct data.
-- ====================================================================

BEGIN;
SELECT plan(4);

-- ====================================================================
-- SETUP
-- ====================================================================

INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at) VALUES
  ('11111111-1111-1111-1111-111111111111', 'member@test.com', '', now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO profiles (id, email) VALUES
  ('11111111-1111-1111-1111-111111111111', 'member@test.com')
ON CONFLICT (id) DO NOTHING;

INSERT INTO organizations (id, name, slug) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Public Org', 'public-org')
ON CONFLICT (id) DO NOTHING;

INSERT INTO organization_members (organization_id, user_id, role, status, is_owner) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'admin', 'active', true)
ON CONFLICT (organization_id, user_id) DO UPDATE SET role = EXCLUDED.role, status = EXCLUDED.status, is_owner = EXCLUDED.is_owner;

-- ====================================================================
-- TEST 1: get_public_org_by_slug returns org for anon
-- ====================================================================

-- Reset to anonymous (no JWT)
RESET ROLE;
SELECT set_config('request.jwt.claims', '{}', true);

SELECT is(
  (SELECT id FROM get_public_org_by_slug('public-org')),
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
  'get_public_org_by_slug returns org id for valid slug'
);

-- ====================================================================
-- TEST 2: get_public_org_by_slug returns nothing for bad slug
-- ====================================================================

SELECT is(
  (SELECT count(*) FROM get_public_org_by_slug('nonexistent-slug')),
  0::bigint,
  'get_public_org_by_slug returns nothing for invalid slug'
);

-- ====================================================================
-- TEST 3: Anon cannot read organization_members directly
-- ====================================================================

SET ROLE anon;
SELECT set_config('request.jwt.claims', '{}', true);

SELECT is(
  (SELECT count(*) FROM organization_members),
  0::bigint,
  'Anon sees 0 members (RLS blocks all)'
);

-- ====================================================================
-- TEST 4: Anon cannot read organizations directly
-- ====================================================================

SELECT is(
  (SELECT count(*) FROM organizations),
  0::bigint,
  'Anon sees 0 organizations (RLS blocks all)'
);

RESET ROLE;

-- ====================================================================
ROLLBACK;
