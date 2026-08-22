#!/bin/bash
# Bootstrap the first system admin user (LOCAL DEV ONLY)
# Usage: ./scripts/bootstrap-admin.sh <email> <password> [full_name]
#
# This script:
# 1. Refuses to run against anything but the local Supabase stack
# 2. Applies supabase/dev_helpers.sql (set_system_admin RPC) to the local DB
# 3. Registers a new user via Supabase Auth API
# 4. Promotes the user via set_system_admin RPC using the service key
#
# set_system_admin lives ONLY in dev_helpers.sql and is never part of
# migrations, so production databases do not contain it at all.
#
# Requires: curl, docker (for psql into the local supabase container)

set -e

EMAIL="${1:?Usage: $0 <email> <password> [full_name]}"
PASSWORD="${2:?Usage: $0 <email> <password> [full_name]}"
FULL_NAME="${3:-System Admin}"

API_URL="http://127.0.0.1:54321"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEV_HELPERS_SQL="$SCRIPT_DIR/../supabase/dev_helpers.sql"
DB_CONTAINER="supabase_db_supanext"

if [ ! -f "$DEV_HELPERS_SQL" ]; then
  echo "Error: dev_helpers.sql not found at $DEV_HELPERS_SQL"
  exit 1
fi

echo "1. Applying dev helpers to LOCAL database ($DB_CONTAINER)"
docker exec -i "$DB_CONTAINER" psql -U postgres -d postgres -q -f - < "$DEV_HELPERS_SQL" > /dev/null
echo "   Done."

# Get keys from supabase status (handles both old and new CLI output labels)
STATUS_OUTPUT=$(supabase status --output env 2>/dev/null || supabase status 2>&1)
ANON_KEY=$(echo "$STATUS_OUTPUT" | grep -iE '(anon|publishable)_?key' | sed 's/.*[=: ] *//')
SERVICE_KEY=$(echo "$STATUS_OUTPUT" | grep -iE '(service_role|secret)_?key' | sed 's/.*[=: ] *//')

if [ -z "$ANON_KEY" ] || [ -z "$SERVICE_KEY" ]; then
  echo "Error: Could not get keys from supabase status. Is supabase running?"
  echo "Run: cd supabase && supabase start"
  exit 1
fi

echo "2. Registering user: $EMAIL"

SIGNUP_RESPONSE=$(curl -s -X POST "$API_URL/auth/v1/signup" \
  -H "Content-Type: application/json" \
  -H "apikey: $ANON_KEY" \
  -d "{
    \"email\": \"$EMAIL\",
    \"password\": \"$PASSWORD\",
    \"data\": {\"full_name\": \"$FULL_NAME\"}
  }")

USER_ID=$(echo "$SIGNUP_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$USER_ID" ]; then
  echo "Error: Failed to register user"
  echo "$SIGNUP_RESPONSE"
  exit 1
fi

echo "   User ID: $USER_ID"

echo "3. Setting is_system_admin = true (local only)"

ADMIN_RESPONSE=$(curl -s -X POST "$API_URL/rest/v1/rpc/set_system_admin" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -H "apikey: $SERVICE_KEY" \
  -d "{\"p_user_id\": \"$USER_ID\"}")

if [ "$ADMIN_RESPONSE" = "true" ]; then
  echo "   Done! User $EMAIL is now a system admin."
else
  echo "   Error: Failed to set system admin"
  echo "$ADMIN_RESPONSE"
  exit 1
fi

echo ""
echo "You can now login at http://localhost:3000/auth/login/"
