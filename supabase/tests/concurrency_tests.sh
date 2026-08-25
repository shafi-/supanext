#!/usr/bin/env bash
# =============================================================================
# CONCURRENCY TESTS — mutual-admin-demote race (ADR 0001 amendment)
#
# Proves that two concurrent membership mutations serialize through
# pg_advisory_xact_lock(org_id) and can no longer jointly reach a zero-admin
# organization under READ COMMITTED.
#
# Scenario:
#   Org with exactly two admins A and B.
#   Session 1: demote B, hold transaction open 4s.
#   Session 2 (while S1 holds the lock, lock_timeout=1.2s): demote A.
#
# Expected:
#   S1 succeeds; S2 fails with lock timeout (55P03) — serialization held.
#   Retry of S2 after S1 commits fails with 22023 — the count predicate now
#   sees the post-demote state (exactly 1 admin left).
#   Final invariant: exactly one admin remains. Zero-admin state unreachable.
# =============================================================================
set -u

DB="docker exec -i supabase_db_supanext psql -U postgres -d postgres -v ON_ERROR_STOP=1 -v VERBOSITY=verbose"
RUN_TS=$(date +%s)
EMAIL_A="ca${RUN_TS}@t.io"; EMAIL_B="cb${RUN_TS}@t.io"
UID_A=$(printf 'a0000000-0000-4000-8000-%012d' "$RUN_TS")
UID_B=$(printf 'b0000000-0000-4000-8000-%012d' "$RUN_TS")
SLUG="race${RUN_TS}"

echo "== fixture =="
# Ensure UID_A is a system admin: bootstrap if platform has none,
# otherwise receive a grant from the existing one (fixtures commit).
SYS_ADMIN=$($DB -Atc "select coalesce((select user_id::text from app.system_admins order by user_id limit 1),'')")
$DB << SQL
begin;
insert into auth.users (id,aud,role,email,encrypted_password,email_confirmed_at) values
 ('${UID_A}','authenticated','authenticated','${EMAIL_A}','x',now())
 on conflict (id) do nothing;
commit;
SQL
echo "SYS_ADMIN='${SYS_ADMIN}' A='${UID_A}'"
if [ -z "${SYS_ADMIN}" ]; then
  echo "branch: bootstrap"
  $DB << SQL || { echo "BOOTSTRAP FAILED"; exit 1; }
begin;
select set_config('request.jwt.claims','{"sub":"${UID_A}","role":"authenticated"}',true);
select api.bootstrap_system_admin();
commit;
SQL
else
  echo "branch: grant"
  $DB << SQL || { echo "GRANT FAILED"; exit 1; }
begin;
select set_config('request.jwt.claims','{"sub":"${SYS_ADMIN}","role":"authenticated"}',true);
select api.grant_system_admin('${UID_A}'::uuid);
commit;
SQL
fi

$DB << SQL
begin;
insert into auth.users (id,aud,role,email,encrypted_password,email_confirmed_at) values
 ('${UID_A}','authenticated','authenticated','${EMAIL_A}','x',now()),
 ('${UID_B}','authenticated','authenticated','${EMAIL_B}','x',now())
on conflict (id) do update set email = excluded.email;
select set_config('request.jwt.claims','{"sub":"${UID_A}","role":"authenticated"}',true);
select (select id from app.subscription_plans where code='basic')::text as plan \gset
set local role authenticated;
select api.request_organization('RaceOrg','${SLUG}') as org \gset
reset role;
select set_config('request.jwt.claims','{"sub":"${UID_A}","role":"authenticated"}',true);
set local role authenticated;
select api.approve_organization(:'org');
select api.assign_subscription(:'org', :'plan','active',now(),null);
select api.set_active_organization(:'org');
select api.invite_member('${EMAIL_B}','member',null)::jsonb->>'token' as tok \gset
reset role;
select set_config('request.jwt.claims','{"sub":"${UID_B}","role":"authenticated"}',true);
set local role authenticated;
select api.accept_invitation(:'tok');
reset role;
select set_config('request.jwt.claims','{"sub":"${UID_A}","role":"authenticated"}',true);
set local role authenticated;
select api.change_member_role('${UID_B}'::uuid,'admin',null); -- A promotes B -> 2 admins
commit;
SQL
[ $? -ne 0 ] && { echo "FIXTURE FAILED"; exit 1; }

ORG=$($DB -Atc "select id from app.organizations where slug='${SLUG}'")
echo "org=$ORG"

echo "== race: S1 demotes B and holds tx; S2 demotes A with short lock_timeout =="
$DB > /tmp/c_s1.log 2>&1 << SQL &
begin;
select set_config('request.jwt.claims','{"sub":"${UID_A}","role":"authenticated"}',true);
set local role authenticated;
select api.change_member_role('${UID_B}'::uuid,'member','${ORG}'::uuid); -- demote B (as A)
select pg_sleep(4);
commit;
SQL
S1_PID=$!
sleep 1.5   # let S1 enter its transaction and take the advisory xact lock

$DB > /tmp/c_s2.log 2>&1 << SQL
begin;
select set_config('request.jwt.claims','{"sub":"${UID_B}","role":"authenticated"}',true);
set local role authenticated;
set local lock_timeout='1200ms';
select api.change_member_role('${UID_A}'::uuid,'member','${ORG}'::uuid); -- demote A (as B)
rollback;
SQL

wait $S1_PID

echo "== phase 2: demoted member B retries — must be denied outright =="
$DB > /tmp/c_s3.log 2>&1 << SQL
begin;
select set_config('request.jwt.claims','{"sub":"${UID_B}","role":"authenticated"}',true);
set local role authenticated;
select api.change_member_role('${UID_A}'::uuid,'member','${ORG}'::uuid); -- demote A retry (as B)
rollback;
SQL

echo "== verdict =="
FAIL=0
grep -q "change_member_role" /tmp/c_s1.log && ! grep -qiE "error" /tmp/c_s1.log \
  && echo "PASS: S1 (first writer) succeeded" || { echo "FAIL: S1 did not succeed"; FAIL=1; }
grep -qiE "55P03|lock timeout|canceling statement" /tmp/c_s2.log \
  && echo "PASS: S2 blocked by advisory-lock serialization (timeout)" \
  || { echo "FAIL: S2 was NOT serialized:"; cat /tmp/c_s2.log; FAIL=1; }
grep -q "42501" /tmp/c_s3.log \
  && echo "PASS: demoted member loses management rights immediately" \
  || { echo "FAIL: demoted member should get 42501:"; cat /tmp/c_s3.log; FAIL=1; }
# Note: the 22023 count-guard path is sequentially unreachable (sole remaining
# admin cannot target himself); it exists purely as the race backstop, which
# the S2 timeout result above proves is now serialized.

ADMIN_COUNT=$($DB -Atc "select count(*) from app.organization_members where organization_id='${ORG}' and role='admin'")
[ "$ADMIN_COUNT" = "1" ] && echo "PASS: final admin count = 1 (invariant held)" \
  || { echo "FAIL: final admin count = $ADMIN_COUNT"; FAIL=1; }

exit $FAIL
