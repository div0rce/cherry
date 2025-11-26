#!/usr/bin/env bash

# Dev login script for Cherry.
# Usage:
#   ./scripts/dev-login.sh [email]
#
# - Logs in via NextAuth Credentials provider
# - Stores cookies in cookies.txt in the project root

EMAIL="${1:-dev@example.com}"
BASE_URL="${BASE_URL:-http://localhost:3000}"

CSRFTOKEN_JSON=$(curl -s -c cookies.txt "$BASE_URL/api/auth/csrf")
CSRF_TOKEN=$(node -e "const res = JSON.parse(process.argv[1] || '{}'); console.log(res.csrfToken || '');" "$CSRFTOKEN_JSON")

if [ -z "$CSRF_TOKEN" ]; then
  echo "Failed to fetch csrfToken from $BASE_URL/api/auth/csrf"
  exit 1
fi

echo "Logging in as $EMAIL ..."
echo "Saving cookies to cookies.txt"

curl -X POST "$BASE_URL/api/auth/callback/credentials?json=true" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "csrfToken=$CSRF_TOKEN&email=$EMAIL&password=dev" \
  -b cookies.txt \
  -c cookies.txt

echo
echo "Done. Cookies stored in cookies.txt"
