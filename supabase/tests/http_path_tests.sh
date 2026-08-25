#!/usr/bin/env bash
# =============================================================================
# HTTP PATH TESTS — real client chain: GoTrue -> JWT -> Kong -> PostgREST -> DB
#
# Proves the database behaves correctly when reached exactly like supabase-js
# reaches it: signed JWTs over HTTP, not set_config impersonation.
#
# Requires: supabase start + supabase db reset. Read-only on DB state except
# one committed org created by the test user (slug httpath<ts>).
# =============================================================================
set -u

API="http://127.0.0.1:54321"
KEY=$( (supabase status 2>/dev/null || (cd "$(dirname "$0")/../.." && supabase status) || (cd "$(dirname "$0")/.." && supabase status)) \
      | awk '/Publishable key/{print $3}' )
[ -z "$KEY" ] && { echo "cannot read publishable key — run inside supabase project"; exit 1; }

TS=$(date +%s)
EMAIL="httptest${TS}@t.io"
PASS="s3cretpass123"
FAIL=0
ok(){ echo "PASS: $1"; }
bad(){ echo "FAIL: $1"; FAIL=1; }

jget(){ python3 -c "import sys,json;d=json.load(sys.stdin);print(d$1)" 2>/dev/null; }

# --- H1: signup through GoTrue ------------------------------------------------
SIGNUP=$(curl -s -X POST "$API/auth/v1/signup" \
  -H "apikey: $KEY" -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}")
TEST_UID=$(echo "$SIGNUP" | jget "['user']['id']")
[ -n "$TEST_UID" ] && ok "signup returns user identity" || { bad "signup failed"; echo "$SIGNUP"; exit 1; }

# --- H2: password login yields signed JWT -------------------------------------
LOGIN=$(curl -s -X POST "$API/auth/v1/token?grant_type=password" \
  -H "apikey: $KEY" -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}")
JWT=$(echo "$LOGIN" | jget "['access_token']")
[ -n "$JWT" ] && ok "login yields access_token" || { bad "login failed"; echo "$LOGIN"; exit 1; }

# NOTE (finding #2): on PostgREST 13, rpc/<fn> resolves against the DEFAULT
# profile (public) unless a profile header names the exposed schema.
# supabase-js equivalent:
#   createClient(url, key, { global: { headers: { 'Content-Profile': 'api' } } })
#   or per-call: client.rpc(fn, args, { headers: { 'Content-Profile': 'api' } })
rpc(){ curl -s -X POST "$API/rest/v1/rpc/$1" \
  -H "apikey: $KEY" -H "Authorization: Bearer ${2:-$JWT}" \
  -H "Content-Profile: api" -H "Content-Type: application/json" ${3:+-d "$3"}; }

# --- H3: session context over real JWT ----------------------------------------
CTX=$(rpc get_session_context)
[ "$(echo "$CTX" | jget "['is_system_admin']")" = "False" ] && ok "session context: not system admin" || bad "is_system_admin wrong"
[ "$(echo "$CTX" | jget "['user_id']")" = "$TEST_UID" ] && ok "session context: identity resolved from signed JWT" || bad "identity mismatch"
[ "$(echo "$CTX" | jget "['organizations']")" = "[]" ] && ok "session context: zero organizations for fresh user" || bad "org leak"

# --- H4: full org flow over HTTP ----------------------------------------------
ORG=$(rpc request_organization "$JWT" "{\"p_name\":\"HttpTestOrg\",\"p_slug\":\"httpath${TS}\"}" | tr -d '"')
[ ${#ORG} = 36 ] && ok "request_organization creates org via RPC" || { bad "org create failed"; echo "$ORG"; }
ACT=$(rpc set_active_organization "$JWT" "{\"p_org_id\":\"$ORG\"}")
echo "$ACT" | grep -q "$ORG" && ok "set_active_organization via RPC" || bad "activate failed: $ACT"
CTXP=$(rpc get_session_context)
[ "$(echo "$CTXP" | jget "['organizations'][0]['status']")" = "pending" ] && ok "pending status visible to owner" || bad "status wrong"

# --- H5: system surface must stay unreachable over HTTP -----------------------
BOOT=$(rpc bootstrap_system_admin)
echo "$BOOT" | grep -qiE "error|denied|already exists" && ok "bootstrap rejected over HTTP" || bad "bootstrap reachable?!: $BOOT"
APPROVE=$(rpc approve_organization "$JWT" "{\"p_org_id\":\"$ORG\"}")
echo "$APPROVE" | grep -qiE "error|denied|not authorized" && ok "self-approval denied over HTTP" || bad "approve reachable?!: $APPROVE"

# --- H6: token forgery / garbage ----------------------------------------------
GARBAGE=$(curl -s -X POST "$API/rest/v1/rpc/get_session_context" \
  -H "apikey: $KEY" -H "Authorization: Bearer not.a.jwt")
echo "$GARBAGE" | grep -qiE "error|invalid|jwt" && ok "garbage bearer rejected by gateway" || bad "garbage accepted?: $GARBAGE"

ANON_CODE=$(curl -s -o /tmp/anon_body.json -w "%{http_code}" -X POST "$API/rest/v1/rpc/get_session_context" \
  -H "apikey: $KEY" -H "Content-Type: application/json")
[ "$ANON_CODE" != "200" ] && ok "missing bearer fails closed (HTTP $ANON_CODE)" \
  || bad "anon reached function without identity: $(cat /tmp/anon_body.json)"

# --- verdict ------------------------------------------------------------------
[ $FAIL = 0 ] && echo "== HTTP PATH TESTS: ALL PASS ==" || echo "== HTTP PATH TESTS: FAILURES ABOVE =="
exit $FAIL
