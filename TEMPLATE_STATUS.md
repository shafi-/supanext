# Template Status

Accurate snapshot of this template's current state.

## Database (supabase/)
- Function-first schema in `api.*` namespace: profiles, organizations,
  organization_members, organization_invitations, plans, plan_features,
  subscriptions, fundraising_campaigns, audit_log, system_admins, permissions
- Deny-all RLS + `security.*` authorization kernel (`has_role_in_active_org`,
  `can_perform`, `token_digest`). Explicit GRANT surface at end of
  `00000000000001_baseline.sql` (single source of truth)
- Status ENUMs live in `app.*` (`app.org_status`, `app.invitation_status`,
  `app.subscription_status`) — defined in the same baseline migration
- Structured invite error codes (INV01/INV02/INV03) encoded in the baseline
  via the `security.consume_invite_token` raises
- pgTAP test suites in `supabase/tests/database/` (run via psql after
  `supabase db reset`; pgtap extension installed by migrations)
- Migration history is intentionally squashed into a single baseline file.
  Branch `chore/squash-migrations` originally collapsed the multi-file
  history; subsequent changes land by amending that baseline

## Client (client/)
- NextJS 14 App Router, static export (`output: 'export'`, no dynamic routes)
- Auth: client-side supabase-js in `useAuth` provider — sign-in/sign-up/
  request-reset/update-password; recovery-link flow completes on
  `/auth/reset-password`
- Login/register honor `?next=` redirect (open-redirect safe)
- Org-centric model: organizations are the primary unit; users join via
  invitations and have per-org roles
- Layering contract (Page → Container → Component) is enforced; the full
  contract, directory layout, and `AppLayout`/`Nav` session exception are
  maintained in `AGENTS.md` and `docs/architecture.md`. Pages are thin
  wrappers over feature containers in `client/src/containers/<feature>/`
- Types: `client/src/types/` holds shared type definitions (organization,
  campaign, profile, status enums, permissions, API contracts, RPC names,
  pagination, database types). Services re-export for backward compatibility
- Org context + permission hooks: `useOrganization` (provides
  `isSystemAdmin`, org/role state), `usePermissions`, `useSystemAdmin`
  (thin re-export of `useOrganization` — single `get_session_context` RPC
  per mount), `useSubscription`, `useProfile`, `useBilling`,
  `usePaginatedList`, `useOrgStats`, `useQueryParam` (provides
  `useRequiredParam` + `isUuid`/`isInviteToken`)
- API contract tests validate every RPC function name + parameter mapping
  between frontend services and `types/database.ts`
- Pages: landing, dashboard (`/app/dashboard/`), profile
  (`/app/profile/`), orgs (`/app/orgs/` + public `/orgs/public/`),
  invite acceptance, admin (orgs/plans/subscriptions/audit log under
  `/admin/*`), auth (login/register/reset-password under `/auth/*`),
  about, privacy
- Route layout: public pages live at root; auth-gated user pages under
  `/app/*`; system-admin pages under `/admin/*`. All routes are
  centralized in `client/src/lib/routes.ts` (`ROUTES` constant +
  `DEFAULT_POST_LOGIN` + `orgDetail(id)` helper); components reference
  `ROUTES.*` rather than hardcoding URLs
- Tests: Vitest unit + contract tests (`client/tests/unit/`), RLS
  integration tests (`client/tests/integration/`), Playwright E2E
  (`client/tests/e2e/`)

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
- Pagination cursor support still missing for member/invite list RPCs
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