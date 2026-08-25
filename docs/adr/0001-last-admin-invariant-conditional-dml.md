# ADR 0001: Last-admin invariant via conditional DML predicate (no row locks)

**Status:** Accepted (amended 2026-08-25 — advisory-lock serialization added, see Amendment)
**Date:** 2026-08-25
**Deciders:** nerddevsltd

## Context

Organization membership must never reach a zero-admin state — an org with no
admin loses all management capability and is unrecoverable through the API.
Two operations can remove an admin: `api.change_member_role` (demotion) and
`api.remove_member`.

The naive pre-check pattern (read admin count, then act) has a
time-of-check-to-time-of-use window under PostgreSQL's default READ COMMITTED
isolation. A stronger pattern serializes writers with `FOR UPDATE` on the
organization row or a transaction-scoped advisory lock.

## Decision

Guard the mutation inside the DML statement itself as a conditional predicate,
evaluated atomically per row:

```sql
update app.organization_members
set role = p_role
where organization_id = v_org_id
  and user_id = p_user_id
  and (
    p_role = 'admin'                       -- promotions never risk the floor
    or v_member_role <> 'admin'            -- target is not an admin anyway
    or (select count(*) from app.organization_members oc
        where oc.organization_id = v_org_id and oc.role = 'admin') > 1
  );
```

Same shape for the DELETE in `remove_member`. Zero rows affected maps to an
explicit `22023` error ("Cannot demote the last organization admin" /
"Organization must retain at least one admin").

No `FOR UPDATE`, no advisory locks, no isolation-level changes.

## Consequences

- **Positive:**
  - Sequential last-admin protection is complete (pentest assertion G1).
  - Guard lives in the same statement as the mutation — impossible to forget or bypass within the function.
  - (Amendment) Concurrent mutual demotion is now impossible: membership mutations serialize per org.
- **Negative:**
  - (Amendment) Membership mutations on one org queue behind each other. Contention is negligible at realistic admin counts.

## Amendment — 2026-08-25

The original decision accepted a concurrent mutual-demote race: two admins
demoting each other in simultaneous transactions each observed `count=2` from
committed snapshots and jointly reached zero admins. This was revisited and
closed:

```sql
perform pg_advisory_xact_lock(hashtext(v_org_id::text));
```

added to both `api.change_member_role` and `api.remove_member` after the
authorization check. The losing transaction blocks until the winner commits,
then re-evaluates its DML predicate against fresh committed state — the
`admin_count > 1` guard now sees the post-change count and rejects with
`22023`. The predicate approach remains the invariant enforcement; the lock
supplies only the serialization it was missing.

## Alternatives Considered

1. **`SELECT ... FOR UPDATE` on the organization row before mutation**
   - Fully closes the race by serializing all membership mutations per org.
   - Rejected: adds a hot-row serialization point and was explicitly declined during design review in favor of the predicate approach.
2. **`pg_advisory_xact_lock(hashtext(org_id::text))`**
   - Same guarantee without visible row locks.
   - Rejected: same reason as above. (Accepted only for the one-shot system-admin bootstrap, where contention is irrelevant.)
3. **Pre-check count then mutate (original implementation)**
   - Identical sequential behaviour, strictly worse TOCTOU surface than the predicate form.
   - Superseded by this decision.
4. **SERIALIZABLE isolation for these transactions**
   - Closes the race at the app layer.
   - Not chosen: pushes concurrency policy into client code; retry semantics leak out of the database boundary.

## Related Decisions

- ADR 0002: Manage-permission grants full delegation authority
- Pentest suite `supabase/tests/pentest_tests.sql` — G1 pins the blocked sequential path; GAP-1 note documents the residual race.

## Implementation Notes

- Files: `supabase/migrations/20240825000000_initial_migration.sql`
  (`api.change_member_role`, `api.remove_member`).
- Advisory locks applied per Amendment. Concurrency proof:
  `supabase/tests/concurrency_tests.sh`.
