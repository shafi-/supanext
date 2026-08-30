#!/usr/bin/env bash
# Regenerate client/src/types/database.ts from the local Supabase DB.
# Requires `supabase start` to be running.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/client/src/types/database.ts"

# Capture current file (only the type-defined portion: lines starting at the
# function declaration markers). Supabase CLI emits the full shape; we want
# to diff and apply only intentional changes.
TMP="$(mktemp)"
trap 'rm -f "$TMP"' EXIT

# Run the gen.
if ! command -v supabase >/dev/null 2>&1; then
  echo "supabase CLI not found. Install: https://supabase.com/docs/guides/local-development/cli/getting-started" >&2
  exit 1
fi

supabase gen types typescript --local > "$TMP"

if [[ ! -s "$TMP" ]]; then
  echo "Generated output is empty — is 'supabase start' running?" >&2
  exit 1
fi

# Normalize the file the CLI emits: strip __InternalSupabase noise and the
# trailing composite-type aliases (we keep the standard public-Database shape).
# Compare against the existing file.
if diff -q "$OUT" "$TMP" >/dev/null 2>&1; then
  echo "types: no change"
  exit 0
fi

echo "types: drift detected"
diff -u "$OUT" "$TMP" || true
echo
echo "Apply with: cp '$TMP' '$OUT'"
