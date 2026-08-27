create or replace function api.get_org_public(p_org_id text)
returns jsonb
language sql
security definer
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', o.id,
    'name', o.name,
    'slug', o.slug,
    'status', o.status,
    'created_at', o.created_at
  )
  from app.organizations o
  where (o.id::text = p_org_id or o.slug = lower(trim(p_org_id)))
    and o.status in ('active', 'pending')
  limit 1;
$$;

grant execute on function api.get_org_public(text) to anon, authenticated;
