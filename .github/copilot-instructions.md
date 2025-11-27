# Cherry • AI Agent Playbook

## Runtime & Layout
- Next.js 16 App Router + React 19 (React Compiler). Default to server components; place interactive hooks in `app/<route>/client.tsx` gated with `'use client'`.
- Tailwind v4 tokens live in `app/globals.css`. Prefer semantic CSS vars (`--font-geist-*`, `--color-*`) and canonical utilities (e.g., `max-w-48` rather than arbitrary values) to keep lint happy.
- `app/layout.tsx` is the single shell: it loads Geist fonts, wraps children with `AuthProvider`, renders `SidebarNav`, and hosts the global `UserMenu`. Add providers there rather than per-page.

## Auth & Session Flow
- NextAuth config is in `app/api/auth/[...nextauth]/route.ts` (PrismaAdapter + Email/Google). Secrets come from `.env.local`; the session callback adds `session.user.id`.
- Server handlers should import `withUser` from `lib/with-user.ts` to enforce auth and surface `userId`. Never read cookies directly.
- Client code uses `useSession()` and reacts to `401` by calling `signIn()` (see `app/cards/client.tsx`). The header’s `UserMenu` already wires `signOut()` with a dropdown.

## Data & Money Rules
- Prisma models live in `prisma/schema.prisma` (`User`, `Card`, `RewardRule`, `Bucket`, `SimulatedTransaction`, `MerchantCategory`, `MccToRewardCategory`). After schema edits run `npx prisma migrate dev --name <tag>` then `npx prisma generate`.
- Monetary values are integer cents. Forms accept dollars, convert via `Math.round(value * 100)`, and APIs/DB only see cents. Render via `formatCents` helpers in pages like `app/cards/page.tsx`.
- Always import Prisma from `@/lib/prisma`; never instantiate a new client outside that module.

## Simulation Engine & APIs
- `lib/simulation.ts` resolves merchant → category via `mccCategoryMapper`, finds the best card/bucket, and returns bucket deltas plus routing metadata. `/api/simulate` wraps this in a Prisma transaction, updates bucket balances (unless strict decline), and records a `SimulatedTransaction`.
- API routes are thin: validate payloads, log via `lib/logger.ts`, call Prisma, and rely on `withUser`. Key handlers: `/api/cards`, `/api/buckets`, `/api/simulate`, `/api/simulations`, `/api/admin/clear-user`, `/api/seed-demo`.

## Seed, MCC ingest, and Admin flows
- `npm run ingest:mcc [path]` executes `scripts/ingest-mcc.ts`, parsing `data/mcc/sanitized-mcc.tsv`, inferring categories, and logging unmapped codes to `data/mcc/unmapped-mcc.json`.
- `npm run seed:demo` calls `scripts/seed-demo.ts`, which in turn invokes `lib/demo-seeder.ts` to upsert demo cards/buckets (be mindful of cents + reward rule typing). The in-app Admin page triggers the same helper via `/api/seed-demo` and `/api/admin/clear-user`.
- `npx tsx prisma/scripts/fixBuckets.ts` normalizes bucket categories/balances after schema tweaks.

## UI Conventions
- Data-fetching server components should call backend routes via `getBaseUrl()` with `{ cache: 'no-store' }` and await async `params` per React 19 requirements.
- Client forms: uppercase categories, confirm destructive actions (`window.confirm`), convert dollar inputs to cents, and finish with `router.refresh()`.
- Styling aims for “glass” cards: use `border-white/5`, `bg-white/5`, `bg-slate-900/70`, and consistent typography tokens so new tiles (cards, buckets, simulations) match the design system.

## Product & Hardware Context
- `docs/cherry-vision.md` defines the “Cherry is a copilot, not a card” guardrails. Features must stay outside payment rails and emphasize the Observe → Evaluate → Recommend → Reward loop.
- `docs/cherry-vine.md` outlines Cherry Vine, the in-store hardware beacon. Any hardware/POS work should treat Vine as a context broadcaster (merchant + amount) that never touches card data.

Need something else? Reference AGENTS.md for repo-wide norms and ask maintainers if a pattern isn’t documented yet.
  