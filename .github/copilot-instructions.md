# Cherry • AI Agent Playbook

Status: **Active**. Follow this alongside `AGENTS.md`, `docs/cherry-vision.md`, `docs/cherry-vine.md`, `docs/wallet-pass.md`, and `docs/api.md`. Never frame Cherry as a payment card/terminal; `/api/scan` stays advisory; `/api/wallet/cherry-pass` returns 501 until certs exist.

## Runtime & Layout
- Next.js 16 App Router + React 19 (React Compiler). Default to server components; place interactive hooks in `app/<route>/client.tsx` gated with `'use client'`.
- Tailwind v4 tokens live in `app/globals.css`. Prefer semantic CSS vars (`--font-geist-*`, `--color-*`) and canonical utilities (e.g., `max-w-48` rather than arbitrary values) to keep lint happy.
- `app/layout.tsx` is the single shell: it loads Geist fonts, wraps children with `AuthProvider`, renders `SidebarNav`, and hosts the global `UserMenu`. Add providers there rather than per-page.

## Auth & Session Flow
- NextAuth config is in `app/api/auth/[...nextauth]/route.ts` (PrismaAdapter + Email/Google). Secrets come from `.env.local`; the session callback adds `session.user.id`.
- Server handlers should import `withUser` from `lib/with-user.ts` to enforce auth and surface `userId`. Never read cookies directly.
- Client code uses `useSession()` and reacts to `401` by calling `signIn()` (see `app/cards/client.tsx`). The header’s `UserMenu` already wires `signOut()` with a dropdown.
- Recommendation sessions:
  - `/api/sessions` (POST) creates a `RecommendationSession` from user input (merchant, amount, optional category) using the unified engine.
  - `/api/sessions/[id]/confirm` and `/api/sessions/[id]/verify` update sessions and `CherryPointLedger` entries, moving points between PENDING/POSTED/REVOKED and marking anomalies when invariants are broken.
  - Use Zod schemas from `lib/validation/sessions.ts` (or equivalent) in these routes; never trust raw `request.json()`.

## Data & Money Rules
- Prisma models live in `prisma/schema.prisma`:
  - Core: `User`, `Card`, `RewardRule`, `Bucket`, `SimulatedTransaction`, `MerchantCategory`, `MccToRewardCategory`.
  - Recommendation & rewards: `RecommendationSession` (per “scan before pay” / Vine order) and `CherryPointLedger` (points movements, anomalies, verification status).
  - After schema edits run `npx prisma migrate dev --name <tag>` then `npx prisma generate`. Treat schema changes as breaking: update code, migrations, and docs in lockstep.
- Monetary values are integer cents. Forms accept dollars, convert via `Math.round(value * 100)`, and APIs/DB only see cents. Render via `formatCents` helpers in pages like `app/cards/page.tsx`.
- Always import Prisma from `@/lib/prisma`; never instantiate a new client outside that module.

## Simulation Engine & APIs
- Engine:
  - `lib/engine.ts` is the canonical engine. It resolves categories (MCC-aware), evaluates bucket health and card rewards, computes verdicts (budget/card/overall), and Cherry Points incentives.
  - Do not reimplement engine logic in routes; always call the helpers exported from `lib/engine.ts`.
- Input validation:
  - All API routes that touch the engine (`/api/simulate`, `/api/scan`, `/api/sessions`, `/api/vine/order`) must validate payloads with Zod schemas from `lib/validation/*`.
  - Reject invalid shapes with clear 4xx responses instead of letting unsafe data flow into the engine or Prisma.
- Core APIs:
  - `/api/simulate` — one-off simulation: returns verdict + card/bucket suggestion, records a `SimulatedTransaction`, and updates bucket spend according to strict-mode rules.
  - `/api/scan` — “scan before pay” UX: runs the engine and returns a recommendation payload, without necessarily creating a session.
  - `/api/sessions` — creates a `RecommendationSession` from scan-like input and offers Cherry Points for compliance.
  - `/api/sessions/[id]/confirm` — user claims they followed advice; updates the session and creates PENDING ledger rows, marking anomalies if card/amount/time invariants fail.
  - `/api/sessions/[id]/verify` — simulated verification step (bank/receipt/Vine): reconciles claims, flips ledger entries to POSTED or REVOKED, and updates anomaly flags.
  - `/api/vine/order` — Vine order ingestion: accepts an `OrderContext`, runs the engine, creates a bound `RecommendationSession`, and returns a token + decision for the Vine simulator or future hardware/App Clip.

## Seed, MCC ingest, and Admin flows
- MCC ingest:
  - `npm run ingest:mcc [path]` executes `scripts/ingest-mcc.ts`, parsing `data/mcc/sanitized-mcc.tsv`, inferring categories, and logging unmapped codes to `data/mcc/unmapped-mcc.json`. The engine relies on this mapping; keep it in sync.
- Demo seeding:
  - `npm run seed:demo` calls `scripts/seed-demo.ts`, which uses `lib/demo-seeder.ts` to upsert demo cards/buckets, create sample simulations, and seed representative `RecommendationSession` + `CherryPointLedger` rows. The in-app Admin page triggers the same helper via `/api/seed-demo`.
- Admin tools:
  - `/admin` surfaces:
    - “Seed demo data” → `/api/seed-demo`
    - “Clear user data” → `/api/admin/clear-user`
    - “Clear Cherry Sessions” → `/api/admin/clear-sessions`
    - “Clear Cherry Points Ledger” → `/api/admin/clear-ledger`
    - “Health check” → `/api/admin/health` and `/api/health`
  - These endpoints are strictly for local/sandbox usage; do not rely on them in production.
- Integrity:
  - `scripts/audit-integrity.ts` walks sessions and ledger entries to flag anomalies and invariant violations. Use it after schema or engine changes.

## UI Conventions
- Data-fetching server components should call backend routes via `getBaseUrl()` with `{ cache: 'no-store' }` and await async `params` per React 19 requirements.
- Client forms: uppercase categories, confirm destructive actions (`window.confirm`), convert dollar inputs to cents, and finish with `router.refresh()`.
- Styling aims for “glass” cards: use `border-white/5`, `bg-white/5`, `bg-slate-900/70`, and consistent typography tokens so new tiles (cards, buckets, simulations) match the design system.
- Pre-swipe and Vine:
  - `/vine-simulator` is the dev UI for Vine. New UX around sessions and claims should clearly differentiate “simulated Vine device” vs “manual scan,” hide “Confirm and award points” when there is no recommended card/bucket (INSUFFICIENT_DATA verdict), and show session/token/diagnostic info only in dev-oriented panels.

## Product & Hardware Context
- `docs/cherry-vision.md` defines the “Cherry is a copilot, not a card” guardrails. Features must stay outside payment rails and emphasize the Observe → Evaluate → Recommend → Reward loop.
- `docs/cherry-vine.md` outlines Cherry Vine, the in-store hardware beacon. Any hardware/POS work should treat Vine as a context broadcaster (merchant + amount) that never touches card data.
- Recommendation sessions and verification are the glue between Cherry Pass, Vine, and any future Plaid/receipt integrations: features must use these primitives rather than invent new ad-hoc reward tracking.

Need something else? Reference AGENTS.md for repo-wide norms and ask maintainers if a pattern isn’t documented yet.
  
