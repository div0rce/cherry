Status: Active
Last updated: 2026-04-27

## What Cherry Is
Cherry is a **real-time spending copilot**. It observes context (merchant, amount, user budgets/cards), runs an engine, recommends the right card and budget impact, and offers Cherry Points for following advice. Cherry:
- Does **not** front, proxy, or route payments.
- Does **not** act as a payment card or terminal.
- Operates the loop **Observe → Evaluate → Recommend → Reward** only.

Cherry Vine (future hardware) is a **context beacon** (merchant + amount) and never touches payment rails. Cherry Pass is scaffolded only today; until Apple certs exist and the feature flag is enabled, `GET /api/wallet/cherry-pass` intentionally returns **501**.

Canonical docs: `docs/cherry-vision.md`, `docs/legal-constraints.md`, `docs/cherry-vine.md`, `docs/wallet-pass.md`, `docs/api.md`, `AGENTS.md`.

---

## Current behavior
- Lab-ready engine/UI/admin; productionization gaps: real bank ingest, automated verification/ledger posting, enforced Vine signatures, observability/rate limiting.
- Wallet pass stays gated at 501 until certs/flag are configured; Vine remains context-only.

## Future/Target behavior
- Production-ready verification and automated ledger posting after ingest verification.
- Enforced Vine signature lifecycle and expanded device coverage.

---

## Stack and Layout
- Next.js 16 (App Router), React 19, Tailwind tokens in `app/globals.css`.
- Server-first pages under `app/`; client components marked with `"use client"`.
- Auth: NextAuth (PrismaAdapter) with `with-user` guard on APIs.
- Data: Postgres via Prisma (`prisma/schema.prisma`).
- Core flows:
  - `/scan` (dev UI) → `/api/scan` for advisory preview, then `/api/sessions` to create a recommendation session.
  - `/api/scan` is stateless and advisory-only; it does not persist sessions or ledger rows.
  - `/sessions` UI lists sessions and ledger statuses.
  - `/vine-simulator` exercises `/api/vine/order` (dev-only Vine ingest).
  - `/admin` exposes local-only maintenance actions.

---

## Getting Started (local)
```bash
npm install
npm run dev
```

The repo runtime is Node 24.15.0. Use `.nvmrc` / `engines.node` as the source of truth, and keep PATH stable (e.g. `/usr/bin:/bin:/usr/local/bin`) so `rg`, `git`, and `node` resolve deterministically.

## Health Gates
```bash
CHERRY_TMP_ROOT="$HOME/.cherry-tmp" CHERRY_VINE_SIGNATURE_MODE=enforce npm run verify:repo-closure
```

For day-to-day development, use the narrowest proof that covers the changed surface.
`npm test` is the partitioned full runtime runner: root legacy tests, `tests/node`,
then `tests/next`. Runtime ownership is enforced by
`tests/node/guardrails/test-runner-ownership.test.ts`. DB tests remain separate under
`npm run test:db`.

---

## Key Commands and Scripts
- Dev server: `npm run dev`
- Build/serve: `npm run build && npm run start`
- Prisma:
  - `npx prisma migrate dev --name <desc>` — apply schema changes
  - `npx prisma generate` — regenerate client after edits
  - `npx prisma studio` — inspect data (users, cards, buckets, sessions, ledger)
- Data:
  - `npm run ingest:mcc [path]` — populate MCC → RewardCategory mapping
  - `npm run seed:demo` — seed demo cards/buckets/sessions/ledger rows
  - `npm run dev:ingest:moustafa-bank [userEmail|userId]` — DEV ONLY; ingest moustafa SafeBalance CSV into `BankTransaction` with `source="csv_dev"` (blocked in production)
  - `npm run dev:evaluator:moustafa [userEmail|userId]` — DEV ONLY; offline engine replay of csv_dev `BankTransaction` rows into `HistoricalEngineEvaluation`
  - Offline evaluator commands write only to `HistoricalEngineEvaluation` and are diagnostic-only.
  - They must never affect Sessions, Ledger, Buckets, or user-facing behavior.
- Integrity: `npm run audit:integrity`
- Dev login (cookies): `./scripts/dev-login.sh [email]` → writes `cookies.txt`

---

## API Quickstart (authenticated; use cookies from `dev-login.sh`)
```bash
# Buckets
curl http://localhost:3000/api/buckets -b cookies.txt

# Simulate a hypothetical spend (records SimulatedTransaction)
curl -X POST http://localhost:3000/api/simulate \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"amountCents":5000,"category":"DINING","merchantName":"Chipotle"}'

# Create a recommendation session (Manual Lookup & Rewards)
curl -X POST http://localhost:3000/api/sessions \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"merchantName":"Chipotle","amountCents":2200,"currency":"USD"}'

# Confirm a session (claim points; moves ledger to PENDING)
curl -X POST http://localhost:3000/api/sessions/<sessionId>/confirm \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"followedRecommendation":true,"actualAmountCents":2200}'

# Verify/revoke a session (simulated verification)
curl -X POST http://localhost:3000/api/sessions/<sessionId>/verify \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"verified":true}'

# Vine order ingestion (dev simulator)
curl -X POST http://localhost:3000/api/vine/order \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"deviceId":"VINE-SIM-1","merchantName":"Chipotle","amountCents":2200,"currency":"USD","source":"VINE_SIM","timestamp":1732765200000,"mcc":"5812"}'
```
Also available via UI: `/scan`, `/sessions`, `/vine-simulator`, `/admin`.

---

## Data Model (selected Prisma models)
- `Card`, `RewardRule` — user cards and category multipliers.
- `Bucket` — per-category budgets with `budgetAmount`, `spentCents`, `strictMode`, `periodStart/End`.
- `SimulatedTransaction` — sandbox simulations (non-authoritative history).
- `RecommendationSession` — advisory decision (manual scan or Vine), verdicts, coverage, offered points, expiry, anomaly flags.
- `CherryPointLedger` — Cherry Points movements (PENDING/POSTED/REVOKED) tied to sessions; anomalies flagged.
- MCC mapping tables: `MerchantCategory`, `MccToRewardCategory`.

Always import Prisma from `@/lib/prisma` and validate inputs with Zod schemas in `lib/schemas/*` plus `parseJsonBody` from `lib/validation.ts`.

---

## Related docs
- `docs/cherry-vision.md` — product identity and legal guardrails (copilot, not a card).
- `docs/cherry-vine.md` — hardware/context blueprint and `/api/vine/order` contract.
- `docs/wallet-pass.md` — Wallet pass scaffold and 501 gating.
- `docs/api.md` — endpoint reference, including `/api/scan` (advisory only).
- `AGENTS.md` — operating rules for contributors/agents.
- `docs/repo-structure.md` — canonical layout of this repo and conventions for new code.

### Cherry Wallet Pass (storeCard, not payment)
- Endpoint: `GET /api/wallet/cherry-pass`
- Default behavior: returns **501 Not Implemented** unless `CHERRY_WALLET_PASS_ENABLED=true` **and** all Apple Wallet env vars are set; no cert/file access occurs otherwise.
- Purpose: loyalty-style trigger into the advisory flow; never a payment instrument. See `docs/wallet-pass.md` for full details.

---

## Editor/Tooling Notes
- Use workspace TypeScript in VS Code; restart TS/ESLint servers after Prisma changes.
- Third-party typing gaps must be patched via `types/compat/**` with a documented audit boundary.
- Tailwind tokens live in `app/globals.css`; prefer semantic utilities.
- Keep lint/typecheck green; add focused tests when touching engine/sessions/ledger logic.
