-- Simplify paginated RPCs: return flat arrays instead of { items, next_cursor }.
-- Client derives hasMore (items.length === limit) and cursor (last item's id)
-- via usePaginatedList with cursorField: 'id'.
-- ULID is time-sortable — order by id desc gives "newest first" naturally.

-- -----------------------------------------------------------------------------
-- list_all_organizations: return flat array
-- -----------------------------------------------------------------------------
create or replace function api.list_all_organizations(
  p_limit int default 20,
  p_cursor text default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_limit int := least(greatest(coalesce(p_limit, 20), 1), 100);
  v_rows jsonb;
begin
  if not security.is_system_admin() then
    raise exception using errcode = '42501', message = 'Not authorized';
  end if;

  select coalesce(jsonb_agg(t), '[]'::jsonb) into v_rows
  from (
    select id, name, slug, status,
      case when status = 'suspended' then suspension_note end as suspension_note,
      created_at
    from app.organizations
    where (p_cursor IS NULL OR id < p_cursor)
    order by id desc
    limit v_limit
  ) t;

  return v_rows;
end;
$$;

-- -----------------------------------------------------------------------------
-- list_plans: return flat array
-- -----------------------------------------------------------------------------
create or replace function api.list_plans(
  p_limit int default 20,
  p_cursor text default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_limit int := least(greatest(coalesce(p_limit, 20), 1), 100);
  v_rows jsonb;
begin
  if not security.is_system_admin() then
    raise exception using errcode = '42501', message = 'Not authorized';
  end if;

  select coalesce(jsonb_agg(t), '[]'::jsonb) into v_rows
  from (
    select sp.id, sp.code, sp.name, sp.description,
      sp.price_minor, sp.currency, sp.billing_interval, sp.is_active,
      coalesce((
        select jsonb_agg(f.code order by f.code)
        from app.plan_features pf join app.features f on f.id = pf.feature_id
        where pf.plan_id = sp.id
      ), '[]'::jsonb) as features
    from app.subscription_plans sp
    where (p_cursor IS NULL OR sp.id < p_cursor)
    order by sp.id desc
    limit v_limit
  ) t;

  return v_rows;
end;
$$;

-- -----------------------------------------------------------------------------
-- list_campaigns: return flat array
-- -----------------------------------------------------------------------------
create or replace function api.list_campaigns(
  p_org_id text default null,
  p_limit int default 20,
  p_cursor text default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_org_id text := coalesce(p_org_id, (select pr.active_organization_id::text from app.profiles pr where pr.id = auth.uid()));
  v_limit int := least(greatest(coalesce(p_limit, 20), 1), 100);
  v_rows jsonb;
begin
  if not security.can_perform('fundraising.view', v_org_id) then
    raise exception using errcode = '42501', message = 'Not authorized';
  end if;

  select coalesce(jsonb_agg(t), '[]'::jsonb) into v_rows
  from (
    select to_jsonb(c.*) as data
    from app.fundraising_campaigns c
    where c.organization_id = v_org_id
      and (p_cursor IS NULL OR c.id < p_cursor)
    order by c.id desc
    limit v_limit
  ) t;

  -- Unwrap the nested data field
  select coalesce(jsonb_agg(item -> 'data'), '[]'::jsonb) into v_rows
  from jsonb_array_elements(v_rows) as item;

  return v_rows;
end;
$$;

-- -----------------------------------------------------------------------------
-- get_organization_members: return flat array
-- -----------------------------------------------------------------------------
create or replace function api.get_organization_members(
  p_org_id text default null,
  p_limit int default 20,
  p_cursor text default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_org_id text := coalesce(p_org_id, (select pr.active_organization_id::text from app.profiles pr where pr.id = auth.uid()));
  v_limit int := least(greatest(coalesce(p_limit, 20), 1), 100);
  v_rows jsonb;
begin
  if not security.is_org_member(v_org_id) then
    raise exception using errcode = '42501', message = 'Not authorized';
  end if;

  select coalesce(jsonb_agg(t), '[]'::jsonb) into v_rows
  from (
    select jsonb_build_object(
      'user_id', om.user_id::text,
      'email', u.email,
      'display_name', p.display_name,
      'role', om.role,
      'permissions', coalesce((
        select jsonb_agg(pm.code order by pm.code)
        from app.organization_member_permissions omp
        join app.permissions pm on pm.id = omp.permission_id
        where omp.organization_id = om.organization_id
          and omp.user_id = om.user_id
      ), '[]'::jsonb)
    ) as data
    from app.organization_members om
    join auth.users u on u.id = om.user_id
    left join app.profiles p on p.id = om.user_id
    where om.organization_id = v_org_id
      and (p_cursor IS NULL OR om.user_id::text < p_cursor)
    order by om.user_id::text desc
    limit v_limit
  ) t;

  -- Unwrap the nested data field
  select coalesce(jsonb_agg(item -> 'data'), '[]'::jsonb) into v_rows
  from jsonb_array_elements(v_rows) as item;

  return v_rows;
end;
$$;

-- Grants
grant execute on function api.list_all_organizations(int, text) to authenticated;
grant execute on function api.list_plans(int, text) to authenticated;
grant execute on function api.list_campaigns(text, int, text) to authenticated;
grant execute on function api.get_organization_members(text, int, text) to authenticated;
