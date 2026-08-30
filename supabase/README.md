# Supabase

Postgres schemas, migrations, RLS, and a function-first API surface live here. The frontend never queries tables directly — it calls `api.*` RPCs over PostgREST.

## Layout

```
supabase/
├── config.toml              # Local Supabase CLI config
├── migrations/              # Numbered SQL migrations (applied in order)
├── seed.sql                 # Idempotent baseline data (features, permissions, plans)
├── dev_helpers.sql          # Local-only debug helpers (never deployed)
└── functions/               # Edge functions (if any)
```

## Common commands

```bash
# Start the local stack (Postgres + Auth + PostgREST + Studio).
supabase start

# Apply all migrations + seed.sql against the local DB.
supabase db reset

# Create a new empty migration.
supabase migration new <descriptive_name>
# → writes supabase/migrations/<timestamp>_<descriptive_name>.sql

# Diff current local DB against migrations/ → emit a new migration.
supabase db diff -f <descriptive_name>

# Push migrations to the linked remote project.
supabase db push

# Show migration status (local vs remote).
supabase migration list

# Regenerate TypeScript types from the local schema.
#   Output is hand-edited in this repo (src/types/database.ts) — review
#   the diff before committing; trim to public surface.
supabase gen types typescript --local > client/src/types/database.ts

# Open psql against the local DB.
psql 'postgresql://postgres:postgres@localhost:54322/postgres'

# Open Studio (GUI).
#   http://127.0.0.1:54323
```

## Schemas at a glance

| Schema | Owner | Purpose |
|---|---|---|
| `auth` | Supabase | `auth.users`, sessions. Never modified by our migrations. |
| `app` | Template | Persistent state (ULID text PKs). |
| `security` | Template | Auth primitives: `generate_ulid`, `is_system_admin`, `can_perform`, `token_digest`. |
| `api` | Template | The only entry point the client calls. `SECURITY DEFINER`. |

See `docs/architecture.md` for diagrams.

## Adding a migration

1. **Generate the file**:
   ```bash
   supabase migration new add_feature_foo
   ```
2. **Write SQL** using the existing patterns:
   - Tables: `id text primary key default security.generate_ulid()`.
   - FKs to `auth.users`: `user_id uuid not null references auth.users(id)`.
   - FKs to our tables: `<col> text not null references app.<table>(id)`.
   - New RPCs: `create or replace function api.<name>(...) returns <type> language plpgsql security definer set search_path = '' as $$ ... $$;`
   - Grant: `grant execute on function api.<name>(<sig>) to authenticated;`
3. **Reset locally** to apply from scratch:
   ```bash
   supabase db reset
   ```
4. **Regen types** if you added/changed columns or RPC signatures:
   ```bash
   supabase gen types typescript --local > client/src/types/database.ts
   ```
5. **Commit** the migration file (and any type changes) in a single commit.

## Seeding data

`supabase/seed.sql` runs automatically on every `supabase db reset`. It is idempotent (`on conflict do nothing`) and seeds:

- 3 features (`fundraising`, `organization_administration`, `platform_administration`)
- 14 permissions (organization + platform scope)
- 3 plans (`free`, `pro`, `enterprise`)
- Plan → feature mapping

The first system admin is **not** seeded — use `scripts/bootstrap-admin.sh` (refuses to run against non-localhost).

## Function-first access

Clients only call `api.*` functions. The contract is:

```ts
// ✅ Correct
const { data, error } = await supabase.rpc('create_campaign', {
  p_org_id: orgId,
  p_name: name,
});

// ❌ Forbidden — bypasses authorization
const { data, error } = await supabase.from('fundraising_campaigns').insert(...);
```

Direct `from()` calls are blocked by RLS deny-all policies on every `app.*` table; see `supabase/migrations/20240825000000_initial_migration.sql` for the policy declarations.

## Authorization flow

Every `api.*` RPC gates itself with `security.can_perform(<code>, <org_id>)`. The check resolves in this order:

1. Is the caller a system admin? → allow.
2. Does `app.organization_member_permissions` grant the code to this user in this org? → allow.
3. Does the org's active subscription include the feature mapped to this permission? → allow.
4. Otherwise → `raise exception using errcode = '42501', message = 'Not authorized'`.

## Local dev helpers

`supabase/dev_helpers.sql` exposes three functions that bypass authorization. They are:

- Restricted to the `service_role` (revoked from `anon` and `authenticated`).
- Excluded from `supabase db push` (not in `migrations/`).
- Documented as local-only.

Install locally with:

```bash
docker exec -i supabase_db_supanext psql -U postgres -d postgres \
  -f - < supabase/dev_helpers.sql
```

## Verifying a migration

Before pushing:

```bash
# 1. Local reset applies from scratch.
supabase db reset

# 2. Lint SQL (requires sqlfluff; optional).
#    Skip if not installed.

# 3. Spot-check with a service-role psql.
psql 'postgresql://postgres:postgres@localhost:54322/postgres' -c \
  "select proname from pg_proc where pronamespace = 'api'::regnamespace order by 1;"

# 4. Run frontend tests against the local DB.
cd client && pnpm test:unit
```

## Deploying to a remote project

1. Link the project once: `supabase link --project-ref <ref>`.
2. Apply migrations: `supabase db push`.
3. Apply seed (only on first deploy, or when plan catalog changes):
   ```bash
   psql "$(supabase db remote get-uri)" -f supabase/seed.sql
   ```
4. Bootstrap the first system admin via the Supabase SQL editor:
   ```sql
   select api.grant_system_admin('<your-user-uuid>');
   ```
   (Or run `scripts/bootstrap-admin.sh` from your local machine if the script
   supports remote mode — currently it does not.)
