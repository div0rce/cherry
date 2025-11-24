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
