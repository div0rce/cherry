# Cherry • AI Agent Playbook

## Runtime & Surface
- Next.js 16 App Router + React 19 with the React Compiler enabled (`next.config.ts`). Prefer server components; only add `"use client"` inside form/interaction files (`app/cards/client.tsx`, `app/simulate/client.tsx`).
- Tailwind v4 tokens live in `app/globals.css`; stick to the provided CSS variables (`--font-geist-*`, `--color-*`).
- Path imports go through `@/*` (see `tsconfig.json`). Keep them intact when moving files to avoid brittle relative paths.

## Data model & conventions
- Prisma schema (`prisma/schema.prisma`) models `User → Card → RewardRule`, plus `Bucket`, `SimulatedTransaction`, and MCC metadata (`MerchantCategory`, `MccToRewardCategory`). Merchant rows now track `vertical/channel/spendDomain/riskProfile/lifeCategory` for tag-based mapping.
- All money stays in integer cents (cards’ `annualFee`, buckets’ `budgetAmount/currentAmount`, simulations’ `amount/rewardsEarned*`). Convert on the edges: UI forms multiply by 100 before POST; server components format via helpers like `formatCents`.
- `DEMO_USER_ID` is hard-coded throughout `app/api/**`. Any mutation should upsert that user instead of introducing auth checks.
- Import the shared Prisma client from `@/lib/prisma`; it memoizes in dev. After schema edits, run `npx prisma migrate dev --name <tag>` then `npx prisma generate`.

## Simulation & APIs
- `runSimulation` (`lib/simulation.ts`) owns category resolution and reward math. It attempts MCC-based mapping first (`mccToRewardCategory`), then explicit `RewardCategory`, then merchant-name heuristics. Reuse this helper instead of duplicating selection logic.
- Card pick: highest multiplier or cashback percent for the resolved category. Bucket pick: most recent bucket for that category. Strict buckets decline when underfunded; soft buckets approve and let balances go negative.
- `/api/simulate` accepts `{ amountCents, merchantName?, category?, mccCode? }`, validates 4-digit MCC codes, upserts `DEMO_USER_ID`, and returns the transaction with eager `chosenCard`/`bucket` references.
- `/api/cards` and `/api/cards/[cardId]/rewards` manage cards + reward rules. Multipliers >1 mean points; values ≤1 represent cash-back percentages (see `app/cards/page.tsx` display logic).
- `/api/buckets` plus `/api/buckets/[bucketId]` manage envelopes (period = `WEEKLY`/`MONTHLY`, `strictMode` gating). `/api/simulations` lists history with filters/pagination; `[id]` handles deletion.

## MCC ingest workflow
- Sanitized source lives at `data/mcc/sanitized-mcc.tsv` (tab-delimited: `mccCode`, description, network flags, optional notes). Run `npm run ingest:mcc [path]` to re-import.
- `scripts/ingest-mcc.ts` parses each row, derives merchant tags (`inferTagsFromMcc`), writes them onto `MerchantCategory`, and maps tags to a `RewardCategory` via `lib/mccCategoryMapper.ts`. Codes that still fall through get logged to `data/mcc/unmapped-mcc.json`.
- Need demo data? `npm run seed:demo` seeds `DEMO_USER_ID`, three cards, and two buckets so the UI/simulations have something to show.

## UI & developer habits
- Server pages fetch via `fetch(base/api, { cache: 'no-store' })` where `base` resolves from `NEXT_PUBLIC_SITE_URL` → `NEXT_PUBLIC_VERCEL_URL` → `http://localhost:3000` (see `app/cards/page.tsx`).
- Client forms uppercase category inputs, convert dollars to cents, send JSON to the App Router API, then `router.refresh()` to revalidate the server tree.
- Destructive actions confirm with `window.confirm` and call the matching DELETE route (`DeleteCardButton`, `DeleteBucketButton`, `DeleteSimulationButton`). Follow that pattern for new delete flows.
- React 19 pattern: `searchParams`/`params` are awaited (`const { cardId } = await params`) to silence the Next.js warning.

## Local workflows
- Typical dev loop: `npm install`, `npm run dev`. Run `npx prisma migrate dev --name <tag>` whenever `schema.prisma` changes, and keep `npm run lint`/`npm run build` clean before committing.
- Database lives at `postgresql://postgres@localhost:5432/cherry`. The Prisma `DATABASE_URL` includes `?schema=public`; when using `psql` drop that suffix (libpq doesn’t understand it) or pass `options=-csearch_path=public`.
- Need insight into MCC coverage? Use `psql ... -c "SELECT category, COUNT(*) FROM \"MccToRewardCategory\" GROUP BY category"` and iterate on the ingest mapping until `RewardCategory.OTHER` shrinks.

Questions or missing context? Ping the maintainer so we can keep this playbook accurate.
  