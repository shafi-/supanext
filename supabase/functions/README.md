# Edge Functions

Supabase Edge Functions (Deno) scaffolding. Currently empty — auth runs
client-side via supabase-js (`client/src/hooks/useAuth.tsx`). Add functions
here only when server-side secrets are required (webhooks, payments,
privileged admin jobs).

```bash
# Local dev
cd supabase && supabase functions serve

# Deploy one / all
supabase functions deploy <name>
supabase functions deploy

# New function scaffold lives at supabase/functions/<name>/index.ts
```

Conventions:
- Verify the caller's JWT before privileged work
  (`req.headers.get('Authorization')` → `supabase.auth.getUser(token)`)
- Reuse business logic from `/backend` where possible
- Never trust request body for authorization decisions — re-check in
  Postgres RLS/RPC like every other code path in this template
