# Architecture Decision Records

Significant architectural decisions for the SupaNext authorization kernel and
multi-tenant schema (`supabase/migrations/20240825000000_initial_migration.sql`).

## Format

Each ADR follows the standard format:
- Status: Proposed, Accepted, Deprecated, Superseded
- Context, Decision, Consequences, Alternatives

## Index

| NBR | Title | Status | Date |
|-----|-------|--------|------|
| 0001 | Last-admin invariant via conditional DML predicate (no row locks) | Accepted | 2026-08-25 |
| 0002 | Manage-permission grants full delegation authority (self-grant permitted) | Accepted | 2026-08-25 |

## Verification

Both decisions are pinned by executable tests:

| ADR | Pinned by |
|-----|-----------|
| 0001 | `supabase/tests/pentest_tests.sql` — G1 (sequential path blocked), GAP-1 (race documented) |
| 0002 | `supabase/tests/pentest_tests.sql` — GAP-2 assertions |

Run:

```bash
supabase db reset
docker exec -i supabase_db_supanext psql -U postgres -d postgres \
  < supabase/tests/pentest_tests.sql
docker exec -i supabase_db_supanext psql -U postgres -d postgres \
  < supabase/tests/behaviour_tests.sql
```

Any change to these decisions must supersede the relevant ADR **and** update
the pinning assertions in the same change.
