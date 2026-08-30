# Architecture

This template ships a Next.js frontend and a Supabase backend (Postgres + Auth + RLS) wired through a single architectural contract: **a strict three-layer frontend, a function-first API schema, and a ULID-keyed application schema**.

## High-level request flow

```mermaid
flowchart LR
  subgraph Browser
    Page["app/<route>/page.tsx<br/>(thin)"]
  end
  subgraph Client["Next.js client (src/)"]
    Container["containers/.../XContainer.tsx<br/>(backend + state)"]
    Component["components/.../X.tsx<br/>(pure view)"]
  end
  subgraph Supabase
    API["api.* RPCs<br/>(SECURITY DEFINER)"]
    Security["security.* helpers<br/>(is_system_admin, can_perform, generate_ulid)"]
    App["app.* tables<br/>(ULID PKs)"]
    Auth["auth.users<br/>(UUID, Supabase-managed)"]
  end

  Page --> Container
  Container --> Component
  Container -- "supabase.rpc()" --> API
  API --> Security
  API --> App
  App -.->|FK| Auth
```

## Frontend layering

The contract in `AGENTS.md` is the source of truth. Three layers, one job each:

```mermaid
flowchart TB
  Page["Page (app/<route>/page.tsx)<br/>Thin. Renders one Container.<br/>No data hooks, no useState for data."]
  Container["Container (containers/<feature>/XContainer.tsx)<br/>Calls services / data hooks. Owns local state.<br/>Renders Components."]
  Component["Component (components/<feature>/X.tsx)<br/>Pure presentation. Receives data + callbacks via props.<br/>No service imports, no data-fetching hooks."]

  Page --> Container
  Container --> Component
  Container -- "Service → Repository → Supabase" --> Container
```

A Container may render many Components, but a Component must never render a Container or call a Service.

## Database schemas

The database is partitioned into four schemas. Each has a single job:

```mermaid
flowchart LR
  subgraph Public["public / extensions"]
    Pgcrypto["pgcrypto<br/>(gen_random_bytes)"]
  end
  subgraph Auth["auth (Supabase-managed)"]
    AuthUsers["auth.users<br/>(UUID id)"]
  end
  subgraph Security["security (template-owned)"]
    GenULID["generate_ulid()"]
    TokenDigest["token_digest()"]
    IsSysAdmin["is_system_admin()"]
    HasRole["has_role_in_active_org()"]
    CanPerform["can_perform(p_permission, p_org_id)"]
  end
  subgraph App["app (template-owned, ULID PKs)"]
    Org["organizations"]
    Members["organization_members"]
    Invites["organization_invitations"]
    Subs["organization_subscriptions"]
    Plans["subscription_plans"]
    Features["features"]
    Perms["permissions"]
    PlanFeat["plan_features"]
    Campaigns["fundraising_campaigns"]
    SysAdmins["system_admins"]
    Audit["audit_log"]
  end
  subgraph API["api (template-owned, SECURITY DEFINER RPCs)"]
    OrgRPCs["request_organization, approve_organization, ..."]
    MemberRPCs["invite_member, change_member_role, get_organization_members, ..."]
    CampaignRPCs["create_campaign, list_campaigns, ..."]
    PlanRPCs["list_plans, create_plan, set_plan_feature, ..."]
  end

  Security --> Pgcrypto
  App --> Auth
  API --> Security
  API --> App
```

| Schema | Owner | Job | Trust boundary |
|---|---|---|---|
| `auth` | Supabase | Identity (users, sessions) | Never modified by template migrations |
| `app` | Template | Persistent state (tables) | RLS + grant-restricted |
| `security` | Template | Auth primitives (ULID, role checks) | `SECURITY DEFINER`, run as owner |
| `api` | Template | Single entry point for client (`rpc()`) | `SECURITY DEFINER`, run as owner; client code calls only these |

## Data model (main branch, organization-centric)

```mermaid
erDiagram
  auth_users ||--o{ profiles : "1:1"
  auth_users ||--o{ system_admins : "0..1"
  auth_users ||--o{ organization_members : "N:M"
  organizations ||--o{ organization_members : "has"
  organizations ||--o{ organization_invitations : "has"
  organizations ||--o{ fundraising_campaigns : "owns"
  organizations ||--o{ organization_subscriptions : "has"
  subscription_plans ||--o{ organization_subscriptions : "selected by"
  subscription_plans ||--o{ plan_features : "includes"
  features ||--o{ plan_features : "included in"
  features ||--o{ permissions : "scoped to"
  permissions ||--o{ organization_member_permissions : "granted via"
  organization_members ||--o{ organization_member_permissions : "has"
  organizations ||--o{ audit_log : "subject of"
  auth_users ||--o{ audit_log : "actor"
```

Notes:
- All `app.*` tables use **ULID text** primary keys (26-char Crockford Base32, time-sortable).
- `auth.users.id` is **UUID** (Supabase-managed). FK columns that reference it stay `uuid`.
- `active_organization_id` and `audit_log.entity_id` are `text` (reference ULID tables).
- `profiles.id` is UUID (1:1 with `auth.users`).

## Data model (feat/user-centric-app)

Same diagram minus the org layer:

```mermaid
erDiagram
  auth_users ||--o{ profiles : "1:1"
  auth_users ||--o{ system_admins : "0..1"
  auth_users ||--o{ platform_invitations : "invited by"
  auth_users ||--o{ user_subscriptions : "has"
  auth_users ||--o{ fundraising_campaigns : "created_by"
  subscription_plans ||--o{ user_subscriptions : "selected by"
  subscription_plans ||--o{ plan_features : "includes"
  features ||--o{ plan_features : "included in"
  features ||--o{ permissions : "scoped to"
  permissions ||--o{ user_permissions : "granted via"
  auth_users ||--o{ audit_log : "actor"
```

## Authorization path

Every API RPC follows the same gate:

```mermaid
sequenceDiagram
  participant Client
  participant RPC as api.<function> (SECURITY DEFINER)
  participant Sec as security.can_perform()
  participant App as app.<table>

  Client->>RPC: supabase.rpc('create_campaign', { p_org_id, ... })
  RPC->>Sec: can_perform('fundraising.create', p_org_id)
  Sec-->>RPC: true / raise 42501
  RPC->>App: INSERT INTO app.fundraising_campaigns ...
  App-->>RPC: id (ULID)
  RPC->>App: INSERT INTO app.audit_log ...
  RPC-->>Client: returns the new id
```

`can_perform` resolves a permission code in this order:
1. Is the caller a system admin? → allow.
2. Does the user hold the explicit permission in `organization_member_permissions`? → allow.
3. Does the org's active subscription include the feature mapped to this permission? → allow.
4. Otherwise → raise `42501 insufficient_privilege`.

## Pagination contract

Both branches use the same shape: SQL returns a flat JSONB array, the frontend hook derives `hasMore` and the next cursor.

```mermaid
sequenceDiagram
  participant Hook as usePaginatedList
  participant Service as CampaignService
  participant RPC as api.list_campaigns
  participant DB

  Hook->>Service: fetchItems({ cursor, limit })
  Service->>RPC: rpc('list_campaigns', { p_org_id, p_cursor, p_limit })
  RPC->>DB: WHERE id < p_cursor ORDER BY id DESC LIMIT p_limit
  DB-->>RPC: T[...]
  RPC-->>Service: T[] (jsonb)
  Service-->>Hook: T[]
  Hook->>Hook: hasMore = items.length === limit<br/>nextCursor = items.at(-1)[cursorField]
```

- `cursorField` defaults to `'id'` on main, `'created_at'` on user-centric (where it sorts campaigns by recency for now).
- ULID is time-sortable, so `WHERE id < p_cursor` + `ORDER BY id DESC` is consistent for all ULID-keyed tables.
- For `auth.users`-backed listings (`list_all_users`), the cursor is the `created_at` timestamp cast through `p_cursor::timestamptz`.

## Feature scaffolder

`./scripts/setup.sh feature <name>` generates six files from templates, sed-replacing `{{PASCAL}}`, `{{SNAKE}}`, `{{PLURAL}}`. See `docs/adding-a-feature.md` for the full walkthrough.
