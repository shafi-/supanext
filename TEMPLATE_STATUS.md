# Template Status

Accurate snapshot of what this template ships today.

## Database (supabase/)
- Function-first schema: profiles, organizations, members, roles, todos,
  invites, subscriptions, audit logs
- Deny-all RLS + guarded RPC functions; explicit GRANT surface declared at
  the end of `20240817120000_security_hardening.sql` (single source of truth)
- Security-hardening migration fixes: privilege-escalation via
  `set_system_admin`, cross-tenant view leaks, unguarded subscription
  readers, PII exposure via `get_user_profile`, invite email-match
  enforcement, race-free `bootstrap_system_admin`
- pgTAP test suites in `supabase/tests/database/` (run via psql after
  `supabase db reset`; pgtap extension installed by migrations)

## Client (client/)
- NextJS 14 App Router, static export (`output: 'export'`, no dynamic routes)
- Auth: client-side supabase-js in `useAuth` provider — sign-in/sign-up/
  request-reset/update-password; recovery-link flow completes on
  `/auth/reset-password`
- Login/register honor `?next=` redirect (open-redirect safe)
- Layers: pages → services → repositories → supabase manager. Note: page
  components call services directly today; container extraction pending
- Org context + permission hooks: `useOrganization`, `usePermissions`
  (DB-driven permissions with static fallback), `useSystemAdmin`,
  `useRequiredParam` + `isUuid`/`isInviteToken` validators
- Pages: landing, dashboard, orgs (+public org page), invite acceptance,
  admin (stats/orgs/plans/subscriptions), profile, billing tab
- Tests: Vitest unit, Playwright E2E specs in `client/tests/e2e/`

## Scaffolding (intentionally empty)
- `backend/` — shared edge-function business logic
- `supabase/functions/` — edge functions; add when server-side secrets needed

## Dev-only helpers (never in production)
`supabase/dev_helpers.sql` defines `set_system_admin`, `reset_development_data`,
`create_test_user`. Deliberately excluded from `supabase/migrations/` so
`db push` can never ship them to production — they exist only after manual
apply to the local DB (`scripts/bootstrap-admin.sh` does this automatically
and refuses non-local targets).

## Known Gaps / Next Up
- Extract containers layer from pages (architecture contract says containers
  own service calls; pages currently violate this)
- Admin UI for granting system admins (`grant_system_admin` RPC exists,
  no screen yet)
- Pagination for list RPCs (`get_todos`, `get_organization_members`)
- Billing is MANUAL MODE by design: `subscribe_to_plan` records 'paid'
  unconditionally (admin invoices offline). To charge real money later,
  replace client-callable subscribe RPCs with PSP webhook writes via an
  edge function and drop the owner-INSERT policy on
  `organization_subscriptions` — webhook becomes the only writer
- Expired-invite cleanup job; audit-log retention
- Bump Next 14.0.4 → latest patch line

## Quick Start
```bash
./scripts/setup.sh setup     # bootstrap envs
cd supabase && supabase start && supabase db reset
../scripts/bootstrap-admin.sh <email> <password>   # first system admin
cd ../client && pnpm install && pnpm dev
```

First-admin rule: `bootstrap_system_admin()` succeeds only while zero
admins exist (advisory-lock serialized). Afterwards, new admins are granted
only by existing admins.
