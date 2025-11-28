## Cherry Lab (local dev)

Next.js 16 (App Router), React 19, Tailwind tokens in `app/globals.css`, Prisma 6 with Postgres, and a recommendation/session + Cherry Points ledger model.

### Getting started
```bash
npm install
npm run dev
```

Before pushing changes, run:

```bash
npm run check
```

which executes lint + strict typechecking for the app (and scripts, if configured).

### Prisma + DB
- `npx prisma migrate dev` — create/sync schema
- `npx prisma studio` — browse/edit data
- Recommendation sessions & Cherry Points:
  - `RecommendationSession` stores “scan before pay” and Vine-driven decisions (what was recommended, offered points, verdicts, coverage mode).
  - `CherryPointLedger` tracks points movements (PENDING/POSTED/REVOKED) and anomalies; use `npx prisma studio` to inspect when debugging reward logic.
- Maintenance scripts:
  - Bucket cleanup (uppercase categories, fix balances): `npx tsx prisma/scripts/fixBuckets.ts`
  - Integrity audit (sessions ↔ ledger invariants): `npx ts-node --project tsconfig.scripts.json scripts/audit-integrity.ts`
- MCC ingest (Merchant Category Codes → RewardCategory mapping):
  - Place `data/mcc.pdf` (Citibank PDF) or `data/mcc.csv` in the repo root, or pass a path:  
    `npm run ingest:mcc [path/to/mcc.pdf|mcc.csv]`
  - MCC→RewardCategory mapping is defined in `scripts/ingest-mcc.ts` (`MCC_RANGE_MAPPING`) and used by the engine to resolve categories from merchant codes.

## Calling authenticated APIs from the terminal

Cherry uses cookie-based auth (NextAuth). For local dev, use the Credentials provider + cookie jar flow:

1. Start the dev server: `npm run dev` (defaults to `http://localhost:3000`).
2. Log in from the terminal (creates `cookies.txt`):
   ```bash
   ./scripts/dev-login.sh              # defaults to dev@example.com
   # or
   ./scripts/dev-login.sh you@example.com
   ```
   The script fetches a CSRF token, calls the Credentials provider, and writes cookies to `cookies.txt`.
3. Call APIs with the cookie jar:
   ```bash
   curl http://localhost:3000/api/buckets -b cookies.txt

   curl -X POST http://localhost:3000/api/simulate \
     -H "Content-Type: application/json" \
     -b cookies.txt \
     -d '{
       "amountCents": 5000,
       "category": "DINING",
       "merchantName": "Chipotle"
     }'

# Create a recommendation session (scan before pay)
curl -X POST http://localhost:3000/api/sessions \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "merchantName": "Chipotle",
    "amountCents": 2200,
    "currency": "USD"
  }'

# Exercise Vine order ingestion (simulated device)
curl -X POST http://localhost:3000/api/vine/order \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "deviceId": "VINE-SIM-1",
    "merchantName": "Chipotle",
    "amountCents": 2200,
    "currency": "USD",
    "source": "VINE_SIM",
    "timestamp": 1732765200000
  }'
   ```
4. Or use the helper harness: `./scripts/simulate.sh` (requires `cookies.txt`; run the login script first).

Optional legacy: you can still export `SESSION_COOKIE` manually if you prefer. See `docs/terminal-api.md`.

You can also exercise Vine order ingestion from the browser via `/vine-simulator`, which wraps `/api/vine/order` with a dev-friendly form and shows the resulting session/token.

### Editor setup (keep IDE in sync with CLI)
- In VS Code: Command Palette → “TypeScript: Select TypeScript Version” → “Use Workspace Version,” then “TypeScript: Restart TS server.”
- Ensure the ESLint extension honors the flat config: enable “ESLint: Use Flat Config” and restart the ESLint server.
- After editing `prisma/schema.prisma`, run `npx prisma generate` so the editor picks up the updated client and enums; restart the TS server if diagnostics seem stale.
- Prisma client & enums:
  - After editing `prisma/schema.prisma`, always run `npx prisma generate` so both `npm run typecheck` and VS Code see the latest enums and model fields.
  - If VS Code shows enum/field errors that `npm run typecheck` does not, run “TypeScript: Restart TS server” and “ESLint: Restart ESLint Server” from the Command Palette.
- Scripts:
  - If you add new TS scripts under `scripts/`, ensure they are covered by `tsconfig.scripts.json` and (optionally) by `npm run typecheck:scripts`, so CLI and IDE stay aligned.
