# ADR 0002: Manage-permission grants full delegation authority (self-grant permitted)

**Status:** Accepted
**Date:** 2026-08-25
**Deciders:** nerddevsltd

## Context

The permission model seeds an organization-scoped permission
`organization.members.permissions.manage`. Holding it allows a member to call
`api.set_member_permission` — including targeting themselves. A pentest probe
(`supabase/tests/pentest_tests.sql`, GAP-2) confirmed the blast radius: a
manage-holder can grant themselves any other organization-scoped permission
(e.g. `fundraising.delete`) without further approval.

This raised the question of whether self-granting constitutes a privilege-
escalation vulnerability requiring mitigation.

## Decision

Treat `organization.members.permissions.manage` as full delegation authority,
by definition. No self-target restriction, no elevation guard, no approval
workflow for grants. The behaviour is pinned by a pentest assertion so any
future tightening is a conscious contract change, not silent drift.

Rationale for the bound being safe:

1. `manage` can only be bestowed by an organization admin or a system admin.
2. Organization admins already implicitly hold **every** organization-scoped
   permission via the admin shortcut in `security.can_perform` (role='admin'
   bypasses the explicit-permission check; feature entitlements still apply).
3. Therefore a manage-holder's ceiling equals the power of whoever delegated
   to them. Delegation creates zero new platform-level privilege.

## Consequences

- **Positive:**
  - Permission semantics stay simple and standard (admin-capability style RBAC): one permission = one authority domain.
  - No approval workflow, no extra tables, no UI for "pending grants".
  - Escalation ceiling is provably bounded by existing trust relationships.
- **Negative:**
  - A single misdirected `manage` grant hands over org-admin-equivalent power silently; there is no friction point where a granter re-confirms intent.
  - "Manage" and "hold everything" are not distinguishable in audit output — reviewing who holds what requires reading `organization_member_permissions` directly (sealed surface) rather than an API.
- **Risks:**
  - Social/operational: admins granting `manage` casually may not realize its weight. Mitigated by documentation here and in `docs/access-permissions.md` once that document is synced with the new schema.

## Alternatives Considered

1. **Forbid self-targeting in `set_member_permission`**
   - Trivially worked around: grant to a second account controlled by the same person, or two manage-holders grant each other.
   - Adds code and a false sense of safety. Not chosen.
2. **"Grant only permissions you hold yourself" rule**
   - Common hardening pattern; prevents pure escalation for non-admin holders.
   - Not chosen: changes product semantics for zero practical gain given the ceiling argument above — anyone holding `manage` was deliberately trusted by an actor with superset power.
3. **Sysadmin approval workflow for permission changes**
   - Maximum control.
   - Not chosen: heavy operational cost for routine org self-management; contradicts the function-first, org-autonomous design of the schema.

## Related Decisions

- ADR 0001: Last-admin invariant via conditional DML predicate
- Admin-shortcut semantics live in `security.can_perform`
  (`supabase/migrations/20240825000000_initial_migration.sql`).

## Implementation Notes

- Pinned by: `supabase/tests/pentest_tests.sql`, section "Documented gaps /
  accepted risks" (GAP-2 assertions).
- If product later wants tighter delegation (e.g. "no self-elevation"), this
  ADR must be superseded and both pentest assertions updated deliberately.
