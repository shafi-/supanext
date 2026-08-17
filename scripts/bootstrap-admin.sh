#!/bin/bash
# Bootstrap the first system admin user
# Usage: ./scripts/bootstrap-admin.sh <email> <password> [full_name]
#
# This script:
# 1. Registers a new user via Supabase Auth API
# 2. Sets is_system_admin = true via set_system_admin RPC
#
# Requires: curl

set -e

EMAIL="${1:?Usage: $0 <email> <password> [full_name]}"
PASSWORD="${2:?Usage: $0 <email> <password> [full_name]}"
FULL_NAME="${3:-System Admin}"

API_URL="http://127.0.0.1:54321"
ANON_KEY="sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH"
SERVICE_KEY="REMOVED_SECRET"

echo "1. Registering user: $EMAIL"

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

echo "2. Setting is_system_admin = true"

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
