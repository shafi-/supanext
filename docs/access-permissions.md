# Access Permission Structure

## Authorization Hierarchy

```
System Admin (created directly via script)
├── Create/revoke system admins
├── Manage all users (list, assign subscriptions, deactivate)
├── Manage subscription plans (create, update, feature flags)
└── Manage platform invitations

Regular User
├── Own resources (campaigns, subscription)
├── Manage own profile
└── View own subscription + features
```

## Roles

| Role | Scope | Stored In |
|------|-------|-----------|
| System Admin | Platform-wide | `profiles.is_system_admin` |
| User | Own resources | `auth.uid()` (row-level ownership) |

## Tables

### `profiles`

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK, references `auth.users(id)` |
| full_name | TEXT | |
| avatar_url | TEXT | |
| metadata | JSONB | Flexible user data |
| is_system_admin | BOOLEAN | Platform admin flag |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

### `user_campaigns`

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| user_id | UUID | FK -> `auth.users(id)` |
| name | TEXT | |
| description | TEXT | |
| goal_minor | INTEGER | Amount in smallest currency unit |
| currency | TEXT | ISO 4217 |
| starts_at | TIMESTAMPTZ | |
| ends_at | TIMESTAMPTZ | |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

### `user_subscriptions`

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| user_id | UUID | FK -> `auth.users(id)`, UNIQUE |
| plan_id | UUID | FK -> `subscription_plans(id)` |
| status | TEXT | `active`, `paused`, `cancelled` |
| billing_period | TEXT | `monthly` or `yearly` |
| current_period_start | TIMESTAMPTZ | |
| current_period_end | TIMESTAMPTZ | |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

### `subscription_plans`

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| name | TEXT | |
| description | TEXT | |
| price_monthly | NUMERIC | |
| price_yearly | NUMERIC | |
| features | JSONB | Feature codes array |
| is_active | BOOLEAN | |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

### `platform_invitations`

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| email | TEXT | |
| invited_by | UUID | FK -> `auth.users(id)` |
| plan_id | UUID | FK -> `subscription_plans(id)` |
| billing_period | TEXT | |
| token | TEXT | UNIQUE, for acceptance |
| expires_at | TIMESTAMPTZ | |
| accepted_at | TIMESTAMPTZ | |
| created_at | TIMESTAMPTZ | |

## Permission Model

### System Admin Permissions

System admins can:
- `list_all_users()` — view all registered users
- `assign_user_subscription(p_user_id, p_plan_id, p_billing_period)` — assign/change any user's subscription
- `deactivate_user_subscription(p_user_id)` — cancel any user's subscription
- `create_plan(...)` / `set_plan_feature(...)` — manage subscription plans
- `invite_platform_user(...)` — invite new users with a plan
- `grant_system_admin(p_user_id)` / `revoke_system_admin(p_user_id)` — manage admin status

### User Permissions

Regular users can:
- `list_my_campaigns()` — view own campaigns
- `create_campaign(...)` — create new campaigns
- `update_campaign(p_campaign_id, ...)` — update own campaigns
- `delete_campaign(p_campaign_id)` — delete own campaigns
- `get_my_subscription()` — view own subscription
- `update_my_profile(...)` — update own profile

### Ownership Checks

All user-resource RPCs enforce ownership via `auth.uid()`:

```sql
-- Example: update_campaign verifies ownership
CREATE OR REPLACE FUNCTION update_campaign(p_campaign_id UUID, ...)
RETURNS void AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM user_campaigns
    WHERE id = p_campaign_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Campaign not found or access denied';
  END IF;
  -- proceed with update
END;
$$;
```

## Utility Functions

### `is_system_admin(user_id UUID) → BOOLEAN`

Check system admin flag. Used by RLS policies for platform-wide access.

**SECURITY DEFINER**.

### `has_feature(p_feature TEXT) → BOOLEAN`

Check if current user's active subscription includes a feature.

**SECURITY INVOKER**.

## Table Permission Matrix

### `profiles`

| Operation | Policy |
|-----------|--------|
| SELECT | own self OR system admin |
| INSERT | trigger only |
| UPDATE | own self OR system admin |
| DELETE | system admin only |

### `user_campaigns`

| Operation | Policy |
|-----------|--------|
| SELECT | own campaigns OR system admin |
| INSERT | authenticated users |
| UPDATE | own campaigns |
| DELETE | own campaigns |

### `user_subscriptions`

| Operation | Policy |
|-----------|--------|
| SELECT | own subscription OR system admin |
| INSERT | system admin only |
| UPDATE | system admin only |
| DELETE | system admin only |

### `subscription_plans`

| Operation | Policy |
|-----------|--------|
| SELECT | all authenticated |
| INSERT/UPDATE/DELETE | system admin only |

### `platform_invitations`

| Operation | Policy |
|-----------|--------|
| SELECT | invited user OR system admin |
| INSERT | system admin only |
| UPDATE | system admin only (accept) |
| DELETE | system admin only (revoke) |

## Key Principles

1. RLS is the source of truth — permissive policies re-open exactly what functions need
2. Every function callable without the service role key is `SECURITY INVOKER`
3. Deny-all by default
4. CRUD functions enforce ownership via `auth.uid()` checks
5. System admin is a single boolean flag, not a separate role table
6. Feature gating via `has_feature()` checks subscription plan features
7. Platform invitations allow admins to onboard users with pre-assigned plans
