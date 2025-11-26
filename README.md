## Cherry Lab (local dev)

Next.js 16 (App Router), React 19, Tailwind tokens in `app/globals.css`, Prisma 6 with Postgres.

### Getting started
```bash
npm install
npm run dev
```

### Prisma + DB
- `npx prisma migrate dev` — create/sync schema
- `npx prisma studio` — browse/edit data
- Bucket cleanup (uppercase categories, fix missing currentAmount): `npx tsx prisma/scripts/fixBuckets.ts`
- MCC ingest (Merchant Category Codes → RewardCategory mapping):
  - Place `data/mcc.pdf` (Citibank PDF) or `data/mcc.csv` in the repo root, or pass a path:  
    `npm run ingest:mcc [path/to/mcc.pdf|mcc.csv]`
  - MCC→RewardCategory mapping is defined in `scripts/ingest-mcc.ts` (`MCC_RANGE_MAPPING`).

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
   ```
4. Or use the helper harness: `./scripts/simulate.sh` (requires `cookies.txt`; run the login script first).

Optional legacy: you can still export `SESSION_COOKIE` manually if you prefer. See `docs/terminal-api.md`.
