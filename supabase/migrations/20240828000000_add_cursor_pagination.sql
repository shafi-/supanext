-- Add cursor-based pagination to listing RPCs
-- Each function now accepts p_limit and p_cursor, returns {items, next_cursor}

-- -----------------------------------------------------------------------------
-- list_all_organizations: add p_cursor, return paginated shape
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
  v_next_cursor text;
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
    where (p_cursor IS NULL OR id::text > p_cursor)
    order by id asc
    limit v_limit + 1
  ) t;

  -- Extract next cursor if there are more rows
  if jsonb_array_length(v_rows) > v_limit then
    v_rows := v_rows - (-1);  -- remove the extra peek row
    v_next_cursor := v_rows -> (-1) ->> 'id';
  else
    v_next_cursor := null;
  end if;

  return jsonb_build_object(
    'items', v_rows,
    'next_cursor', v_next_cursor
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- list_plans: add p_limit + p_cursor, return paginated shape
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
  v_next_cursor text;
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
    where (p_cursor IS NULL OR sp.id::text > p_cursor)
    order by sp.id asc
    limit v_limit + 1
  ) t;

  if jsonb_array_length(v_rows) > v_limit then
    v_rows := v_rows - (-1);
    v_next_cursor := v_rows -> (-1) ->> 'id';
  else
    v_next_cursor := null;
  end if;

  return jsonb_build_object(
    'items', v_rows,
    'next_cursor', v_next_cursor
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- list_campaigns: add p_limit + p_cursor, return paginated shape
-- -----------------------------------------------------------------------------
create or replace function api.list_campaigns(
  p_org_id uuid default null,
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
  v_org_id uuid := coalesce(p_org_id, (select pr.active_organization_id from app.profiles pr where pr.id = auth.uid()));
  v_limit int := least(greatest(coalesce(p_limit, 20), 1), 100);
  v_rows jsonb;
  v_next_cursor text;
begin
  if not security.can_perform('fundraising.view', v_org_id) then
    raise exception using errcode = '42501', message = 'Not authorized';
  end if;

  select coalesce(jsonb_agg(t), '[]'::jsonb) into v_rows
  from (
    select to_jsonb(c.*) as data
    from app.fundraising_campaigns c
    where c.organization_id = v_org_id
      and (p_cursor IS NULL OR c.id::text > p_cursor)
    order by c.id asc
    limit v_limit + 1
  ) t;

  -- Unwrap the nested data field
  select coalesce(jsonb_agg(item -> 'data'), '[]'::jsonb) into v_rows
  from jsonb_array_elements(v_rows) as item;

  if jsonb_array_length(v_rows) > v_limit then
    v_rows := v_rows - (-1);
    v_next_cursor := v_rows -> (-1) ->> 'id';
  else
    v_next_cursor := null;
  end if;

  return jsonb_build_object(
    'items', v_rows,
    'next_cursor', v_next_cursor
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- get_organization_members: add p_limit + p_cursor, return paginated shape
-- -----------------------------------------------------------------------------
create or replace function api.get_organization_members(
  p_org_id uuid default null,
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
  v_org_id uuid := coalesce(p_org_id, (select pr.active_organization_id from app.profiles pr where pr.id = auth.uid()));
  v_limit int := least(greatest(coalesce(p_limit, 20), 1), 100);
  v_rows jsonb;
  v_next_cursor text;
begin
  if not security.is_org_member(v_org_id) then
    raise exception using errcode = '42501', message = 'Not authorized';
  end if;

  select coalesce(jsonb_agg(t), '[]'::jsonb) into v_rows
  from (
    select jsonb_build_object(
      'user_id', om.user_id,
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
      and (p_cursor IS NULL OR om.user_id::text > p_cursor)
    order by om.user_id asc
    limit v_limit + 1
  ) t;

  -- Unwrap the nested data field
  select coalesce(jsonb_agg(item -> 'data'), '[]'::jsonb) into v_rows
  from jsonb_array_elements(v_rows) as item;

  if jsonb_array_length(v_rows) > v_limit then
    v_rows := v_rows - (-1);
    v_next_cursor := v_rows -> (-1) ->> 'user_id';
  else
    v_next_cursor := null;
  end if;

  return jsonb_build_object(
    'items', v_rows,
    'next_cursor', v_next_cursor
  );
end;
$$;

-- Update grants to include the new parameter signatures
grant execute on function api.list_all_organizations(int, text) to authenticated;
grant execute on function api.list_plans(int, text) to authenticated;
grant execute on function api.list_campaigns(uuid, int, text) to authenticated;
grant execute on function api.get_organization_members(uuid, int, text) to authenticated;
