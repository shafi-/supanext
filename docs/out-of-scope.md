# Out of Scope

The following are intentionally **not** part of this template. They were considered but excluded — either for security, scope, or because the project should make its own decision.

## Impersonation

System admins do **not** get a "view as user" feature. The audit_log table is the recommended escape hatch for support investigations — admins can review what an actor did, but cannot act on their behalf.

If a project needs impersonation, it should implement it explicitly:
- The only safe pattern is server-side JWT minting (`supabase.auth.admin.createSession`) scoped to a specific user, with a short TTL and mandatory audit_log rows on start and end.
- The frontend must show a persistent "Impersonating X" banner while the session is active, with a one-click "Stop impersonating" control.
- All API RPCs that mutate state should record an `impersonated_user_id` alongside `actor_user_id` in `app.audit_log`.

Why it's out of scope here:
- Templates should not embed an authenticated-bypass primitive by default. Copying this template would silently grant impersonation, which is a real-world abuse vector.
- The threat model differs per project (B2B SaaS, internal tool, regulated industry). The hardening above is a starting point, not a complete answer.

If you do add impersonation, treat it like adding a new auth primitive: gate the RPC with a dedicated `app.impersonation_sessions` table, log every start/stop, and review the audit log retention policy.

## Other out-of-scope items
- **Email delivery / templates** — Supabase sends confirmation + recovery emails; project-specific templates belong to the project.
- **Payments / billing integration** — the schema has `organization_subscriptions` but no Stripe wiring.
- **Multi-region / read replicas** — single-region Supabase is the default.
- **Public marketing site** — this template is the app, not the landing page.
