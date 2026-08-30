-- Org-level stats for the dashboard.
-- Returns member count and campaign count in a single round-trip.
-- Access: any authenticated org member (same gate as get_organization_members).

begin;

create or replace function api.get_org_stats(p_org_id text default null)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'member_count', (
      select count(*)::int
      from app.organization_members om
      where om.organization_id = p_org_id
    ),
    'campaign_count', (
      select count(*)::int
      from app.fundraising_campaigns fc
      where fc.organization_id = p_org_id
    )
  )
  from security.has_role_in_active_org(p_org_id) h
  where h.org_status <> 'rejected';
$$;

grant execute on function api.get_org_stats(text) to authenticated;

commit;
