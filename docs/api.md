## POST /api/scan — Cherry Pass scan (advisory)

Represents a pre-swipe “scan” in Cherry Pass / Wallet. It returns a read-only advisory recommendation (no DB writes).

Request body:
```json
{
  "merchantName": "Chipotle",
  "category": "DINING",            // optional
  "expectedAmountCents": 2000      // optional; defaults to 0 for bucket snapshot
}
```

Response highlights:
- `merchantName`, `category`, `amountCents` (0 if amount omitted)
- `bucket`: name, limit, spent/remaining with this hypothetical swipe, strictMode, wouldExceed
- `cardRecommendation`: best card id/nickname, reward multiplier, estimated rewards
- `spendingVerdict`: HEALTHY | BORDERLINE | BREAKS_BUDGET
- `cherryIncentive`: points offered and expiry window (minutes)
- `engineDecision`: raw engine output (for UI/debug)

Behavior:
- Uses provided `category`, otherwise infers from most recent transaction for that merchant; defaults to `OTHER`.
- Uses provided `expectedAmountCents`, otherwise 0 for a pure bucket snapshot.
- Calls the transaction engine to compute bucket impact, routing, and rewards.
- Does not persist any transaction in v1.

Example curl (requires auth cookie jar):
```bash
curl -X POST http://localhost:3000/api/scan \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "merchantName": "Chipotle",
    "category": "DINING",
    "expectedAmountCents": 2500
  }' | jq
```
