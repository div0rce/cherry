# Cherry • AI Agent Playbook

## Runtime & Layout
- Next.js 16 App Router + React 19 (React Compiler). Keep server components by default; co-locate client helpers in `app/<route>/client.tsx` and gate them with `'use client'`.
- Tailwind v4 tokens sit in `app/globals.css`; reuse the `--font-geist-*`/`--color-*` vars. Import code via the `@/*` alias from `tsconfig.json`.
- `app/layout.tsx` wires global fonts and `app/providers.tsx` wraps the tree with `SessionProvider`; add providers there instead of re-implementing at each page.

## Auth & session flow
- NextAuth lives in `app/api/auth/[...nextauth]/route.ts` using `PrismaAdapter(prisma)` plus Email + Google providers. Secrets come from `.env.local`; the session callback injects `session.user.id` so downstream API guards can trust it.
- `lib/with-user.ts` (server) wraps handlers with `getServerSession` and returns `401` on failure. All API routes touching user data should call it instead of manually parsing cookies.
- Client code should rely on `useSession()` from `next-auth/react`. When a fetch returns `401`, call `signIn()` rather than surfacing a generic toast (see `app/cards/client.tsx`).

## Data model & money rules
- Prisma schema (`prisma/schema.prisma`) defines `User`, `Card`, `RewardRule`, `Bucket`, `SimulatedTransaction`, `MerchantCategory`, and `MccToRewardCategory`. Re-run `npx prisma migrate dev --name <tag>` + `npx prisma generate` after schema edits.
- Amounts are stored in integer cents. Client forms multiply dollars x100 before POST, and server renderers format via helpers in `lib/simulation.ts` / utility modules.
- Always import Prisma from `@/lib/prisma`; never instantiate `PrismaClient` inline.

## Simulation & API patterns
- `lib/simulation.ts` orchestrates reward resolution: MCC → merchant tags (`mccCategoryMapper`) → reward category → best card/bucket. It runs inside a Prisma transaction and records `SimulatedTransaction` plus bucket deltas.
- API routes under `app/api/*` stay thin: validate payloads, call Prisma, catch errors, and log via `logError` from `lib/logger`. `/api/cards`, `/api/buckets`, `/api/simulate`, `/api/simulations` all expect the `userId` injected by `withUser`.

## MCC ingest + data scripts
- `npm run ingest:mcc [path]` parses `data/mcc/sanitized-mcc.tsv`, infers merchant tags in `scripts/ingest-mcc.ts`, upserts `MerchantCategory`, and rebuilds `MccToRewardCategory`, logging unmapped MCCs to `data/mcc/unmapped-mcc.json`.
- `npm run seed:demo` (`scripts/seed-demo.ts`) recreates a demo user/cards/buckets; `npx tsx prisma/scripts/fixBuckets.ts` normalizes categories + balances. Run these only against disposable data.

## UI conventions & tooling
- Server components fetch with `{ cache: 'no-store' }` using `getBaseUrl()` from `lib/base-url.ts` (falls back to `NEXT_PUBLIC_SITE_URL` → `NEXT_PUBLIC_VERCEL_URL` → `NEXTAUTH_URL` → `http://localhost:3000`). Await `params`/`searchParams` to satisfy React 19’s async boundary rules.
- Client interactions uppercase category inputs, convert cents, and call `router.refresh()` after POST/DELETE. Confirm destructive actions with `window.confirm` in the client helper files.
- Logging must use `lib/logger.ts` (`logInfo/logWarn/logError`) to satisfy `no-console`. ESLint runs through `npm run lint` (`eslint .`), so fix warnings immediately to keep the tree clean.

Need something that isn’t covered here? Ask the maintainer so we can extend these notes.
  