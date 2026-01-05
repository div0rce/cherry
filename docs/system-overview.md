Status: Active
Last updated: 2026-01-03

# Cherry System Overview

## Intent

This document is a descriptive system overview.
It does not define product identity, legal scope, or future commitments.
When conflicts arise, defer to the referenced ground-truth documents.

Ground truth for product identity remains in:
- `docs/cherry-vision.md` (copilot, not a card)
- `docs/legal-constraints.md` (hard legal guardrails)
- `docs/cherry-vine.md` (context beacon)
- `docs/wallet-pass.md` (storeCard scaffold, 501 until certs)
- `docs/api.md` (endpoint contract, `/api/scan` advisory)

This file summarizes where those concepts live in code today and highlights gaps.

---

## Current behavior (enforced / in code)

### Core Loop Mapping (Observe → Evaluate → Recommend → Reward)
- **Observe**
  - Manual inputs: `/scan` dev UI (`app/(dev)/scan/ScanClient.tsx`) posts to `/api/scan` for advisory preview and can create sessions via `/api/sessions`.
  - Advisory-only: `/api/scan` in `app/api/scan/route.ts` runs the engine, allows `expectedAmountCents = 0`, and logs `DecisionEvent` telemetry but does not create sessions or ledger rows.
  - Context ingest: `/api/vine/order` (dev-only) accepts Vine terminal payloads or `OrderContext`, enforces freshness (~3 minutes), creates sessions, and logs authority decisions; simulator UI at `/vine-simulator`.
- **Evaluate**
  - Canonical engine: `lib/engine.ts` (+ invariants in `lib/engine-invariants.ts`), MCC-aware via `resolveCategory`; buckets are rolled in-memory and normalized via `lib/buckets-runtime.ts` before verdicts.
  - Zod schemas ensure typed inputs (`lib/schemas/*` + `parseJsonBody` in `lib/validation.ts`).
- **Recommend**
  - Decisions flow back to clients (`ScanClient`, Vine simulator) with bucket/card verdicts and Cherry incentive offers; `RecommendationSession` stores verdicts, coverageMode, orderToken, expiry.
- **Reward**
  - Claim: `/api/sessions/[id]/confirm` writes `CherryPointLedger` rows (PENDING), flags anomalies, freshens buckets via `ensureBucketFresh`, and increments `spentCents` once per session.
  - Verification: `/api/sessions/[id]/verify` flips ledger to POSTED/REVOKED (simulated today); stubs live in `lib/verification/*`.

---

## Data Model Snapshot (Prisma)
- `Bucket`: budgets per RewardCategory (`budgetAmount`, `spentCents`, `strictMode`, `periodStart/End`, legacy `currentAmount`); runtime balances (`committedCents`, `remainingCents`) come from `lib/buckets-runtime.ts`.
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
- Shared simulations history UI: `/simulate` and `/simulations` render `SimulationHistoryList` (`components/simulations/simulation-history-list.tsx`) with the dark-glass `EmptyStateCard`; extend it by mapping new fields into the `SimulationHistoryItem` shape (title/subtitle/status/meta/body/footer).

---

## Known Gaps / TODOs
- Multiple buckets per category are not prioritized beyond first-created; bucket selection remains naive.
- Vine ingest lacks HMAC/nonce verification and cleanup of expired order tokens (dev-only).
- Wallet pass remains gated; keep 501 until certs are provided and feature flag is on.
- Auto-verification is stubbed; future bank/receipt/Vine correlation should move ledger from PENDING → POSTED without manual calls.
 - Bucket cadence is confirm-only (plus optional Autopilot simulated commits); there is no per-transaction bucket ledger or reconciliation sweep.

---

## Next Focus Areas
1) **Bucket integrity**
   - Decide on bucket ledger semantics and multiple-bucket selection rules.
   - Keep `lib/buckets-runtime.ts` as the single source of truth for balances; ensure any legacy `currentAmount` mirrors derived remaining only.
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

## Future/Target behavior (explicitly speculative)
- Automated verification from bank/receipt sources with background workers.
- Signed Vine payloads and device lifecycle enforcement.
- Bucket ledger for per-transaction accounting and reconciliation.

---

## References
- Identity: `docs/cherry-vision.md`
- Legal constraints: `docs/legal-constraints.md`
- Hardware: `docs/cherry-vine.md`
- Wallet: `docs/wallet-pass.md`
- API contract (including `/api/scan`): `docs/api.md`
- Agent ops: `AGENTS.md`, `.github/copilot-instructions.md`

## Documentation index (all markdown, non-fixture)

### Root docs
- `README.md`
- `AGENTS.md`
- `CONTRIBUTING.md`
- `AUDIT.md`
- `DOC_REWRITE_TASK.md` (temporary)
- `.github/copilot-instructions.md`
- `.github/pull_request_template.md`
- `types/compat/README.md`

### Product identity and legal
- `docs/cherry-vision.md`
- `docs/legal-constraints.md`
- `docs/cherry-vine.md`
- `docs/wallet-pass.md`

### API, routes, and shells
- `docs/api.md`
- `docs/routes-map.md`
- `docs/information-architecture.md`
- `docs/dev-route-inventory.md`
- `docs/dev-ui-parity.md`
- `docs/shell-architecture.md`
- `docs/repo-structure.md`
- `docs/repo-structure-plan.md` (deprecated)

### Engine, authority, buckets
- `docs/authority-v1.md`
- `docs/authority-ui-contract.md`
- `docs/decision-event-ledger.md`
- `docs/buckets-rollover-plan.md`
- `docs/engine-roadmap.md`
- `docs/adapters.md`
- `docs/daily-state.md`

### Autopilot and UI contracts
- `docs/autopilot-master-spec.md`
- `docs/autopilot-engine-adapter.md`
- `docs/autopilot-integration-summary.md`
- `docs/home-ui-contract.md`
- `docs/signin-tasks.md`

### Verification, ingest, evaluator
- `docs/verification-flow.md`
- `docs/bank-ingest-notes.md`
- `docs/offline-evaluator.md`
- `docs/income-regimes.md`

### Guardrails, CI, scripts, linting
- `docs/ci-and-guardrails.md`
- `docs/guardrails.md`
- `docs/guardrails-status.md`
- `docs/guardrails-todo.md` (deprecated)
- `docs/script-standards.md`
- `docs/zod-style.md`
- `docs/audit-format.md`

### Architecture notes
- `docs/architecture/auth.md`
- `docs/architecture/typed-eslint-postmortem.md` (deprecated)
- `docs/architecture/compat-shims.md`

### Audits, plans, and drafts
- `docs/cherry-core-loop-engine-vine-wallet-audit.md`
- `docs/core-loop-audit.md` (deprecated)
- `docs/agent-run-summary.md` (deprecated)
- `docs/marketing-hero-spec.md` (draft)

## Related docs
- `AGENTS.md`
- `docs/ci-and-guardrails.md`
