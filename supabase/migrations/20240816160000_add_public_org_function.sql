-- ====================================================================
-- Public Organization Landing Page
-- ====================================================================
-- Anonymous/public access to org info by slug.
-- SECURITY DEFINER bypasses RLS — only returns safe public fields.
-- ====================================================================

-- View for public org data (no user info, no private fields)
CREATE OR REPLACE FUNCTION get_public_org_by_slug(org_slug TEXT)
RETURNS TABLE (
  id UUID,
  name TEXT,
  slug TEXT,
  description TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT o.id, o.name, o.slug, o.description, o.created_at
  FROM organizations o
  WHERE o.slug = org_slug
    AND EXISTS (
      SELECT 1
      FROM organization_members om
      WHERE om.organization_id = o.id
        AND om.status = 'active'
    );
$$;

-- Allow anonymous access (public page, no auth required)
GRANT EXECUTE ON FUNCTION get_public_org_by_slug(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_public_org_by_slug(TEXT) TO authenticated;
