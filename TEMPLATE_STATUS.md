# Template Status

Accurate snapshot of this template's current state.

## Database (supabase/)
- Function-first schema in `api.*` namespace: profiles, organizations,
  organization_members, organization_invitations, plans, plan_features,
  subscriptions, fundraising_campaigns, audit_log, system_admins, permissions
- Deny-all RLS + `security.*` authorization kernel (has_role_in_active_org,
  can_perform, token_digest). Explicit GRANT surface at end of
  `20240825000000_initial_migration.sql` (single source of truth)
- Status ENUMs: `app.org_status`, `app.invitation_status`,
  `app.subscription_status` (`20240828000000_status_enums.sql`)
- Structured invite error codes: INV01/INV02/INV03 in
  `20240827000000_structured_invite_errors.sql`
- pgTAP test suites in `supabase/tests/database/` (run via psql after
  `supabase db reset`; pgtap extension installed by migrations)

## Client (client/)
- NextJS 14 App Router, static export (`output: 'export'`, no dynamic routes)
- Auth: client-side supabase-js in `useAuth` provider — sign-in/sign-up/
  request-reset/update-password; recovery-link flow completes on
  `/auth/reset-password`
- Login/register honor `?next=` redirect (open-redirect safe)
- Layers: pages → services → repositories → supabase manager. Container
  extraction pending (architecture contract says containers own service calls)
- Types: `types/` directory holds shared type definitions (organization,
  campaign, profile, status enums, permissions, API contracts, RPC names,
  database types). Services re-export for backward compatibility
- Org context + permission hooks: `useOrganization` (also provides
  `isSystemAdmin`), `usePermissions`, `useRequiredParam` + `isUuid`/`isInviteToken`
- API contract tests validate every RPC function name + parameter mapping
  between frontend services and database.ts
- Pages: landing, dashboard, orgs (+public org page), invite acceptance,
  admin (stats/orgs/plans/subscriptions), profile, billing tab
- Tests: Vitest unit + contract tests, Playwright E2E in `client/tests/e2e/`

## Scaffolding (intentionally empty)
- `backend/` — shared edge-function business logic
- `supabase/functions/` — edge functions; add when server-side secrets needed

## Email-optional startup mode
Template ships without SMTP: `enable_confirmations = false`, so signup
works with no email infrastructure. Abuse control is optional Turnstile
captcha — set `NEXT_PUBLIC_TURNSTILE_SITE_KEY` (client) + `[auth.captcha]`
secret (Supabase) to enable; empty = disabled. Password reset requires
SMTP when you turn it on later.

## Dev-only helpers (never in production)
`supabase/dev_helpers.sql` defines bootstrap helpers. Deliberately excluded
from `supabase/migrations/` so `db push` can never ship them to production —
they exist only after manual apply to the local DB (`scripts/bootstrap-admin.sh`
does this automatically and refuses non-local targets).

## Known Gaps / Next Up
- Extract containers layer from pages (architecture contract says containers
  own service calls; pages currently violate this)
- `useSystemAdmin` independent RPC eliminated — now consumes from
  `OrganizationProvider` (single `get_session_context` call per mount)
- Pagination for list RPCs (`get_organization_members`, etc.)
- Billing is MANUAL MODE by design: admin invoices offline. To charge real
  money later, replace client-callable subscribe RPCs with PSP webhook
  writes via an edge function
- Expired-invite cleanup job; audit-log retention
- `dev_helpers.sql` needs rewrite against current `app.*` schema
- pgTAP tests (`behaviour_tests.sql`, `pentest_tests.sql`) stale against
  current schema — need rewrite

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
