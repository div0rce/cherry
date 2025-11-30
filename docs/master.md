Status: Active reference
Last updated: 2025-11-30

# Cherry System Map and Near-Term Plan

Ground truth for product identity remains in:
- `docs/cherry-vision.md` (copilot, not a card)
- `docs/legal-constraints.md` (hard legal guardrails)
- `docs/cherry-vine.md` (context beacon)
- `docs/wallet-pass.md` (storeCard scaffold, 501 until certs)
- `docs/api.md` (endpoint contract, `/api/scan` advisory)

This file summarizes where those concepts live in code today and highlights gaps.

---

## Core Loop Mapping (Observe → Evaluate → Recommend → Reward)
- **Observe**
  - Manual inputs: `/scan` UI posts to `/api/sessions` (App Router client `app/scan/ScanClient.tsx`).
  - Advisory-only: `/api/scan` (stateless) in `app/api/scan/route.ts` for pre-swipe lookup, App Clip/Pass hooks; accepts MCC/category hints and allows `expectedAmountCents = 0`.
  - Context ingest: `/api/vine/order` (dev-only) accepts Vine terminal payloads or `OrderContext`, enforces freshness (~3 minutes), and creates sessions; simulator UI at `/vine-simulator`.
- **Evaluate**
  - Canonical engine: `lib/engine.ts` (+ invariants in `lib/engine-invariants.ts`), MCC-aware via `resolveCategory`; buckets are rolled in-memory before verdicts.
  - Zod schemas ensure typed inputs (`lib/validation/*`).
- **Recommend**
  - Decisions flow back to clients (`ScanClient`, Vine simulator) with bucket/card verdicts and Cherry incentive offers; `RecommendationSession` stores verdicts, coverageMode, orderToken, expiry.
- **Reward**
  - Claim: `/api/sessions/[id]/confirm` writes `CherryPointLedger` rows (PENDING), flags anomalies, freshens buckets via `ensureBucketFresh`, and increments `spentCents` once per session.
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
- Single engine path (`lib/engine.ts`) used by `/api/scan`, `/api/sessions`, `/api/vine/order`; bucket rollover applied in memory for verdict accuracy.
- Session + ledger lifecycle exists with anomaly handling, verification stubs, and bucket spend increment on confirm.
- Dev tooling: Vine simulator UI, admin clear/seed endpoints, MCC ingest script, integrity audit script.
- UI surfaces: Manual Lookup & Rewards (`/scan`), Sessions list (`/sessions`), Vine simulator (`/vine-simulator`), Admin panel (`/admin`).

---

## Known Gaps / TODOs
- Bucket balance reversals are not wired to verification outcomes; rejected claims leave `spentCents` incremented.
- `currentAmount` remains a legacy field; multiple buckets per category are not prioritized beyond first-created.
- Vine ingest lacks HMAC/nonce verification and cleanup of expired order tokens (dev-only).
- Wallet pass remains gated; keep 501 until certs are provided and feature flag is on.
- Auto-verification is stubbed; future bank/receipt/Vine correlation should move ledger from PENDING → POSTED without manual calls.

---

## Next Focus Areas
1) **Bucket integrity**
   - Decide on spend reversal policy when verification fails; document and implement.
   - Remove/retire `currentAmount` from math or clearly mark as legacy in UI.
   - Add tests for rollover, strict-mode overspend, and confirm-time spend increments.
2) **Vine hardening**
   - Add HMAC/nonce validation and token cleanup; keep freshness window documented.
   - Expose `expiresAt`/`orderToken` in simulator UI for clarity if needed.
3) **Verification loop**
   - Flesh out `autoVerifySession` to call `/api/sessions/[id]/verify` based on bank/receipt/Vine signals.
   - Ensure ledger/session anomalies are auditable via scripts or activity feed.
4) **Docs and guardrails**
   - Keep Wallet pass 501 messaging prominent; cross-link identity/legal docs from UI where surfaced.
   - Maintain API docs when shapes change and run `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` after changes.

---

## References
- Identity: `docs/cherry-vision.md`
- Legal constraints: `docs/legal-constraints.md`
- Hardware: `docs/cherry-vine.md`
- Wallet: `docs/wallet-pass.md`
- API contract (including `/api/scan`): `docs/api.md`
- Agent ops: `AGENTS.md`, `.github/copilot-instructions.md`
