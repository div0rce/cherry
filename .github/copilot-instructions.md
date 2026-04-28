Status: Active
Last updated: 2026-01-03

# Cherry • AI Agent Playbook

Read this alongside `AGENTS.md`, `docs/legal-constraints.md`, `docs/cherry-vision.md`, `docs/cherry-vine.md`, `docs/wallet-pass.md`, and `docs/api.md`. Never frame Cherry as a payment card/terminal; `/api/scan` is advisory with telemetry; `/api/wallet/cherry-pass` returns 501 until certs and the feature flag exist.

## GitHub / PR Operating Rule
From now on, the agent must not treat direct commits to `main` as the normal workflow.

The default development flow is:

1. Start from updated `main`.
2. Create a focused branch.
3. Implement the requested change on that branch.
4. Run the relevant verification commands.
5. Commit the change with a clear conventional commit message.
6. Push the branch.
7. Open or prepare a pull request into `main`.
8. Do not merge unless explicitly instructed.

Canonical command flow:

```bash
git checkout main
git pull --ff-only
git checkout -b <type>/<short-description>

# implement changes

git status --short
npm run check
npm test
npm run build

git add .
git commit -m "<type>: <summary>"
git push -u origin <type>/<short-description>
```

The pull request must include:

```md
## Summary
- what changed

## Testing
- commands run
- results

## Risk
- changed domains
- possible regressions
```

Hard rules:

- Never commit directly to `main` unless the user explicitly says to.
- Never merge a PR unless the user explicitly says to.
- Never skip verification silently.
- If verification fails, stop and report the failure.
- If the working tree is dirty before starting, inspect it first and do not overwrite unrelated user changes.
- If a branch already exists, reuse it only if it matches the requested task; otherwise create a new branch.
- Each PR should represent one coherent change. Do not bundle unrelated fixes.
- Prefer `squash and merge` when the user later asks to merge.

This is now the default operating model for all future repo work.

## Current behavior (enforced / in code)
- Engine decisions run through `safeSolveDecisionForUser` / `safeSolveDecisionForWorld` with deterministic inputs and explicit `nowMs`.
- `/api/scan` logs `DecisionEvent` telemetry but does not create sessions or ledger entries.
- Zod schemas live in `lib/schemas/*` and are parsed via `parseJsonBody` from `lib/validation.ts`.
- Prisma is instantiated only in `lib/prisma.ts` and consumed via runtime adapters.

## Runtime & Layout
- Next.js 16 App Router + React 19 (React Compiler). Default to server components; place interactive hooks in `app/<route>/client.tsx` gated with `'use client'`.
- Tailwind v4 tokens live in `app/globals.css`. Prefer semantic CSS vars and canonical utilities.
- `app/layout.tsx` is the shell: Geist fonts, `AuthProvider`, `SidebarNav`, `UserMenu`.

## Auth & Session Flow
- NextAuth config: `app/api/auth/[...nextauth]/route.ts` (PrismaAdapter + Email/Google + dev credentials). Session callback stamps `session.user.id`.
- Server handlers must import `withUser` from `lib/with-user.ts` to enforce auth and surface `userId`. Never read cookies directly.
- Client code uses `useSession()` and reacts to `401` by calling `signIn()`.

## Data & Money Rules (see `docs/legal-constraints.md`)
- Prisma models: `prisma/schema.prisma` (Bucket/Card/RewardRule/RecommendationSession/CherryPointLedger/etc.). Run `npx prisma migrate dev --name <tag>` then `npx prisma generate` after schema edits.
- Monetary values are integer cents. Convert from dollars before hitting APIs; render via `formatCents` helpers.
- Buckets: `spentCents` is incremented once on session confirm after `ensureBucketFresh`; `currentAmount` is legacy and unused post-create.
- Bucket balances must be derived via canonical runtime helpers; do not recompute remaining amounts ad-hoc.
- `currentAmount` is legacy-only and must not be treated as authoritative input.
- Bucket mutation must occur only after freshness is ensured.
- Always import Prisma from `@/lib/prisma`; never create ad-hoc clients.

## Simulation Engine & APIs
- Engine: `lib/engine.ts` is canonical (MCC-aware); invariants in `lib/engine-invariants.ts`. Do not fork logic in routes.
- All decision-making surfaces must route through `safeSolveDecisionForUser` / `safeSolveDecisionForWorld`; no route may implement decision logic inline.
- Validation: All engine-touching APIs (`/api/simulate`, `/api/scan`, `/api/sessions`, `/api/vine/order`) must use Zod schemas in `lib/schemas/*` plus `parseJsonBody`.
- Core APIs:
  - `/api/simulate` — one-off simulation: returns verdict + card/bucket suggestion, records a `SimulatedTransaction`, does **not** mutate buckets.
  - `/api/scan` — advisory “scan before pay”: runs the engine, MCC-aware, allows zero-amount snapshots; logs `DecisionEvent` telemetry but does not create sessions/ledger rows.
  - `/api/sessions` — creates a `RecommendationSession` (source `APP_SCAN`) with orderToken/expiry and offered points.
  - `/api/sessions/[id]/confirm` — blocks expired/duplicate claims, freshens bucket, increments `spentCents` once, writes PENDING ledger rows, flags anomalies (amount/time/card).
  - `/api/sessions/[id]/verify` — simulated verification: flips ledger rows to POSTED/REVOKED, updates anomalies.
  - `/api/vine/order` — Vine ingest (dev-only): accepts terminal events or `OrderContext`, enforces freshness window, runs engine, creates session with orderToken, returns decision.
  - `/api/wallet/cherry-pass` — gated by `CHERRY_WALLET_PASS_ENABLED` + Apple env; returns 501 JSON when disabled; generates `storeCard` pass when fully configured.

## Seed, MCC ingest, and Admin flows
- MCC ingest: `npm run ingest:mcc [path]` → `scripts/ingest-mcc.mts`.
- Demo seeding: `npm run seed:demo` → `scripts/seed-demo.mts` (also via `/api/seed-demo`).
- Admin tools (local-only): `/admin` links to `/api/admin/health`, `/api/health`, and dev-only seed/diagnostic surfaces.
- Integrity: `scripts/audit-integrity.mts` flags session/ledger anomalies.

## UI Conventions
- Server components fetching data should use `{ cache: 'no-store' }` and await async `params`.
- Client forms: uppercase categories, confirm destructive actions, convert dollars to cents, call `router.refresh()`.
- Vine simulator: clearly mark “simulated Vine device” vs “manual scan”; hide confirm flows when verdict is `INSUFFICIENT_DATA`.

## Product & Hardware Context
- `docs/cherry-vision.md` + `docs/legal-constraints.md`: Cherry is a spending copilot, not a card/terminal.
- `docs/cherry-vine.md`: Vine is a context beacon (merchant + amount), never a payment device.
- Recommendation sessions + verification glue Cherry Pass, Vine, and any future bank/receipt integrations—reuse them rather than inventing new reward trackers.
RecommendationSession + CherryPointLedger form the single spine for all reward and verification flows; do not introduce parallel tracking systems.

## Future/Target behavior (explicitly speculative)
- Add new API surfaces only after updating `docs/api.md` and relevant guardrails.

## Related docs
- `AGENTS.md`
- `docs/api.md`
- `docs/ci-and-guardrails.md`
