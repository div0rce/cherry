# Cherry System Map and Near-Term Plan

Status: **Active reference** for mapping the current codebase to Cherry’s product loop and for planning near-term work. Ground truth for product identity remains in:
- `docs/cherry-vision.md` (copilot, not a card)
- `docs/cherry-vine.md` (context beacon)
- `docs/wallet-pass.md` (storeCard scaffold, 501 until certs)
- `docs/api.md` (endpoint contract, `/api/scan` advisory)

This file summarizes where those concepts live in code today and highlights gaps.

---

## Core Loop Mapping (Observe → Evaluate → Recommend → Reward)
- **Observe**
  - Manual inputs: `/scan` UI posts to `/api/sessions` (App Router client `app/scan/ScanClient.tsx`).
  - Advisory-only: `/api/scan` (stateless) in `app/api/scan/route.ts` for pre-swipe lookup, App Clip/Pass hooks.
  - Context ingest: `/api/vine/order` (dev-only) accepts Vine terminal payloads or `OrderContext` and creates sessions; simulator UI at `/vine-simulator`.
- **Evaluate**
  - Canonical engine: `lib/engine.ts` (+ invariants in `lib/engine-invariants.ts`), MCC-aware via `resolveCategory`.
  - Zod schemas ensure typed inputs (`lib/validation/*`).
- **Recommend**
  - Decisions flow back to clients (`ScanClient`, Vine simulator) with bucket/card verdicts and Cherry incentive offers.
  - Persisted recommendations in `RecommendationSession` (Prisma) for manual scan and Vine.
- **Reward**
  - Claim: `/api/sessions/[id]/confirm` writes `CherryPointLedger` rows (PENDING) and flags anomalies.
  - Verification: `/api/sessions/[id]/verify` flips ledger to POSTED/REVOKED (simulated today); stubs live in `lib/verification/*`.

---

## Data Model Snapshot (Prisma)
- `Bucket`: budgets per RewardCategory (`budgetAmount`, `spentCents`, `strictMode`, `periodStart/End`).
- `Card` + `RewardRule`: user cards and category multipliers.
- `RecommendationSession`: persisted recommendation (merchant/mcc/category/amount, verdicts, coverageMode, offered points, expiry, anomalies, orderToken/device/store/terminal IDs).
- `CherryPointLedger`: points movements (PENDING/POSTED/REVOKED) tied to sessions; anomalies recorded.
- `SimulatedTransaction`: sandbox simulations (do not represent verified spend).
- MCC mapping: `MerchantCategory`, `MccToRewardCategory`.
- Auth tables: NextAuth standard models.

---

## Current Strengths
- Single engine path (`lib/engine.ts`) used by `/api/scan`, `/api/sessions`, `/api/vine/order`.
- Session + ledger lifecycle exists with anomaly handling and verification stubs.
- Dev tooling: Vine simulator UI, admin clear/seed endpoints, MCC ingest script, integrity audit script.
- UI surfaces: Manual Lookup & Rewards (`/scan`), Sessions list (`/sessions`), Vine simulator (`/vine-simulator`), Admin panel (`/admin`).

---

## Known Gaps / TODOs
- `/api/scan` should allow zero-amount bucket snapshots and reuse MCC inference consistently (spec in `docs/api.md`).
- Bucket balance semantics need to be enforced consistently (`spentCents` vs `currentAmount`); add rollover helpers.
- Vine ingest is dev-only; add timestamp freshness/HMAC TODOs and cleanup for expired tokens.
- Wallet pass remains gated; keep 501 until certs are provided and add a feature flag for go-live.
- Auto-verification is stubbed; future bank/receipt/Vine correlation should move ledger from PENDING → POSTED.

---

## Near-Term Work (1–2 weeks, no hardware)
1) **Engine & Buckets**
   - Support amount `0` advisory snapshots in `/api/scan`.
   - Standardize bucket accounting (`spentCents`, period rollover) and update engine consumers.
   - Add focused tests for MCC resolution, strict-mode overspend, incentive invariants.
2) **Session Flow Hardening**
   - Ensure `RecommendationSession` stores `source` and non-null `orderToken`; add GET by id for UI.
   - Keep ledger defaults explicit (PENDING on claim, POSTED/REVOKED on verify) and wire `autoVerifySession` hook (even as no-op).
   - Surface expiry countdown + anomalies in `/scan` UI.
3) **Vine Simulator Safety**
   - Fix body parsing to avoid double-read; allow optional MCC with fallback inference.
   - Enforce timestamp freshness; add TODO for HMAC/signature.
   - Return `expiresAt`/`orderToken` to simulator UI; add cleanup script or cron.
4) **Docs and Guardrails**
   - Keep Wallet pass 501 messaging prominent; cross-link identity docs from new pages.
   - Run `npm run lint` and `npm run typecheck` after engine/session changes.

---

## References
- Identity: `docs/cherry-vision.md`
- Hardware: `docs/cherry-vine.md`
- Wallet: `docs/wallet-pass.md`
- API contract (including `/api/scan`): `docs/api.md`
- Agent ops: `AGENTS.md`, `.github/copilot-instructions.md`
