# Backend

Shared business logic for edge functions (Deno). Import from
`supabase/functions/*` via relative paths (`../../backend/...`).

Currently empty scaffolding — add modules here only when logic must be
shared across multiple edge functions or kept off the client (e.g.
secret-dependent operations).

Rules:
- No Supabase client imports here — pure logic/types only
- Edge functions own their request/response handling and auth checks
