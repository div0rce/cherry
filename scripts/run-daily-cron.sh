#!/usr/bin/env bash
set -euo pipefail

# Minimal cron runner for DailyState.
# Requires CHERRY_DAILYSTATE_CRON_ENABLED=true on the server
# and a dev credentials account (same as scripts/dev-login.sh).
# This hits the single-user route; production should call /api/internal/run-daily-all via real cron.

EMAIL="${EMAIL:-dev@example.com}"
BASE_URL="${BASE_URL:-http://127.0.0.1:3000}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$ROOT_DIR"

echo "Running DailyState cron for $EMAIL against $BASE_URL"
BASE_URL="$BASE_URL" "$SCRIPT_DIR/dev-login.sh" "$EMAIL" >/dev/null

curl -s -b cookies.txt -H "Content-Type: application/json" -d '{}' -X POST "$BASE_URL/api/internal/run-daily"
echo
