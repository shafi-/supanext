# Access Permission Structure

## Authorization Hierarchy

```
System Admin (created directly via script)
├── Create/revoke system admins
├── Manage all organizations
├── Manage org owners
└── Manage subscription plans

Org Owner (role='admin' + is_owner=true)
├── Manage org members (add/remove/role)
├── Manage org invites
├── Manage org settings
└── Manage org subscription (subscribe/change/cancel)

Org Admin (role='admin')
├── Assign permissions to members
├── CRUD on org data
└── Read org members/invites/subscription

Org Member (role='member')
├── Read org data
├── CRUD on own todos
└── View org members, subscription
```

## Roles

| Role | Scope | Stored In |
|------|-------|-----------|
| System Admin | Platform-wide | `profiles.is_system_admin` |
| Admin | Per org | `organization_members.role` |
| Member | Per org | `organization_members.role` |

**Owner** is NOT a role value. It's `role='admin'` + `is_owner=true` on `organization_members`.

## Tables

### `role_permissions`

Normalized permission assignments per role. One row per role+permission combination.

| Column | Type | Notes |
|--------|------|-------|
| role | TEXT | 'admin' or 'member' |
| permission | TEXT | e.g. `todos:delete`, `members:invite` |
| created_at | TIMESTAMPTZ | |

**Primary key**: `(role, permission)`

**Index**: `(role, permission)` — used by `can_perform()`

## Permission Names

Format: `resource:action`

| Permission | Description |
|------------|-------------|
| `members:read` | View org members |
| `members:invite` | Add members to org |
| `members:remove` | Remove members from org |
| `members:assign_role` | Change member roles |
| `invites:read` | View org invites |
| `invites:create` | Create org invites |
| `invites:delete` | Revoke org invites |
| `todos:read` | View org todos |
| `todos:create` | Create todos |
| `todos:update` | Update todos |
| `todos:delete` | Delete todos |
| `org:read` | View org details |
| `org:update` | Update org settings |
| `org:delete` | Delete org |
| `subscription:read` | View org subscription |
| `subscription:manage` | Subscribe/change/cancel (owner-only via can_perform short-circuit) |

## Utility Functions

### `can_perform(permission TEXT, org_id UUID) → BOOLEAN`

Central permission check. Used by both RLS policies and CRUD functions.

1. If user is system admin → return true
2. If user is owner of org (`is_owner=true`) → return true
3. Check `role_permissions` table for matching row (user's role + permission)
4. If no row → return false

**SECURITY DEFINER** — breaks RLS recursion by running outside the caller's RLS context. Still reads `auth.uid()` from JWT claims.

### `is_member(user_id UUID, org_id UUID) → BOOLEAN`

Check active membership. Used by RLS policies for org-scoped SELECT.

**SECURITY DEFINER**.

### `is_system_admin(user_id UUID) → BOOLEAN`

Check system admin flag. Used by RLS policies for platform-wide access.

**SECURITY DEFINER**.

### `get_user_role(user_id UUID, org_id UUID) → TEXT`

Get role string. Used by CRUD functions for role-specific logic.

**SECURITY DEFINER**.

### `get_public_org_by_slug(org_slug TEXT) → TABLE`

Returns public org data for anonymous access. Uses `EXISTS` subquery to verify org has active members.

**SECURITY DEFINER** — bypasses RLS so anon can query org data.

## Role Permissions (role_permissions table)

| Permission | Admin | Member |
|------------|-------|--------|
| `members:read` | ✓ | ✓ |
| `members:invite` | ✓ | — |
| `members:remove` | ✓ | — |
| `members:assign_role` | ✓ | — |
| `invites:read` | ✓ | — |
| `invites:create` | ✓ | — |
| `invites:delete` | ✓ | — |
| `todos:read` | ✓ | ✓ |
| `todos:create` | ✓ | ✓ |
| `todos:update` | ✓ | ✓ |
| `todos:delete` | ✓ | ✓ |
| `org:read` | ✓ | ✓ |
| `org:update` | ✓ | — |
| `org:delete` | ✓ | — |
| `subscription:read` | ✓ | ✓ |
| `subscription:manage` | ✓ | — |

**Owner-only** permission: `subscription:manage` is granted to admin role, but `can_perform()` short-circuits on `is_owner=true` — only the owner can manage subscriptions, not other admins.

## Table Permission Matrix

### `profiles`

| Operation | Policy |
|-----------|--------|
| SELECT | own self OR same org members OR system admin |
| INSERT | trigger only |
| UPDATE | own self OR system admin |
| DELETE | system admin only |

### `organizations`

| Operation | Policy |
|-----------|--------|
| SELECT | `can_perform('org:read', id)` |
| INSERT | any authenticated user |
| UPDATE | `can_perform('org:update', id)` |
| DELETE | `can_perform('org:delete', id)` |

### `organization_members`

| Operation | Policy |
|-----------|--------|
| SELECT | `can_perform('members:read', organization_id)` |
| INSERT | `can_perform('members:invite', organization_id)` |
| UPDATE | `can_perform('members:assign_role', organization_id)` |
| DELETE | `can_perform('members:remove', organization_id)` |

### `todos`

| Operation | Policy |
|-----------|--------|
| SELECT | `can_perform('todos:read', organization_id)` |
| INSERT | `can_perform('todos:create', organization_id)` |
| UPDATE | `can_perform('todos:update', organization_id)` |
| DELETE | `can_perform('todos:delete', organization_id)` |

### `invites`

| Operation | Policy |
|-----------|--------|
| SELECT | `can_perform('invites:read', organization_id)` |
| INSERT | `can_perform('invites:create', organization_id)` |
| DELETE | `can_perform('invites:delete', organization_id)` |

### `audit_logs`

| Operation | Policy |
|-----------|--------|
| SELECT | own logs OR same org members OR system admin |
| INSERT | trigger only |
| DELETE | system admin only |

### `roles`

| Operation | Policy |
|-----------|--------|
| SELECT | all authenticated |
| INSERT/UPDATE/DELETE | system admin only |

### `subscription_plans`

| Operation | Policy |
|-----------|--------|
| SELECT | all authenticated |
| INSERT/UPDATE/DELETE | system admin only |

### `organization_subscriptions`

| Operation | Policy |
|-----------|--------|
| SELECT | `can_perform('subscription:read', organization_id)` |
| INSERT | `can_perform('subscription:manage', organization_id)` |
| UPDATE | `can_perform('subscription:manage', organization_id)` |
| DELETE | system admin only |

### `subscription_history`

| Operation | Policy |
|-----------|--------|
| SELECT | `can_perform('subscription:read', organization_id)` OR `is_system_admin()` |
| INSERT | `can_perform('subscription:manage', organization_id)` |
| DELETE | system admin only |

## SECURITY DEFINER

Exception classes only (INVOKER-first rule — everything else is INVOKER):

- **Triggers / auth handler**: `handle_new_user`, `audit_action`, `audit_table_changes`, `update_updated_at_column` (execute revoked from every role)
- **RLS recursion anchors**: `is_system_admin()`, `private.get_user_org_ids()`, `private.find_valid_invite()`, `private.has_pending_invite()`, `private.find_user_id_by_email()` (consulted inside policy expressions; boolean/UUID-only exposure)
- **Anon pre-auth reads**: `validate_invite`, `get_public_org_by_slug`
- **Privileged-column writers** (sole writers of `profiles.is_system_admin`, each guarded by an internal `is_system_admin()` check): `grant_system_admin`, `revoke_system_admin`, `bootstrap_system_admin` (one-shot, advisory-locked)

## SECURITY INVOKER

All CRUD and read functions — RLS handles authorization via policies and `can_perform()`.

## Key Principles

1. RLS is the source of truth — permissive policies re-open exactly what functions need
2. Every function callable without the service role key is SECURITY INVOKER unless it fits a documented DEFINER exception class above
3. Deny-all by default
4. CRUD functions are SECURITY INVOKER — also use `can_perform()` for business logic
5. First system admin created outside UI (`bootstrap_system_admin` works only while zero admins exist)
6. Permissions normalized in `role_permissions` (one row per role+permission)
7. Owner = `role='admin'` + `is_owner=true` (not a separate role)
8. `subscription:manage` is owner-only via `can_perform()` short-circuit on `is_owner`
9. Permission format: `resource:action`
10. Direct table writes are closed at the column level where needed: authenticated may UPDATE only `full_name, avatar_url, metadata` on `profiles`

## pgTAP Test Coverage

34 assertions across 3 test files validate the RBAC model:
- `01_rls_access.sql` — 22 tests: org CRUD, member CRUD, invite CRUD, todo CRUD, profiles, owner-is-admin, admin-can-assign
- `02_subscription_rls.sql` — 8 tests: owner can manage, admin/member blocked, history read/write
- `03_public_org.sql` — 4 tests: get_public_org_by_slug for anon, anon blocked from direct table access
