#!/usr/bin/env bash

# Simple Cherry simulation harness using cookie jar for auth.
# Requires:
#   - Cherry dev server running at http://localhost:3000
#   - cookies.txt created by ./scripts/dev-login.sh

BASE_URL="${BASE_URL:-http://localhost:3000}"

if [ ! -f cookies.txt ]; then
  echo "Error: cookies.txt not found."
  echo "Run ./scripts/dev-login.sh [email] first to log in and create a cookie jar."
  exit 1
fi

echo "Creating simulated DINING transaction: Chipotle $20.00"

curl -X POST "$BASE_URL/api/simulate" \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "amountCents": 2000,
    "category": "DINING",
    "merchantName": "Chipotle"
  }'

echo
echo "Done."
