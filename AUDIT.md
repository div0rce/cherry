# Cherry Audit Log

## [2025-12-02] Repository-wide Completion Assessment

### 1. Summary

- Completion_beta: 66%
- Completion_v1: 66%
- Method: full-repo ingestion; subsystem scoring by implementation, reliability, UX/DX, and doc alignment.

### 2. Subsystem Scores

| Subsystem                         | Weight | Score (%) | Notes |
|-----------------------------------|--------|-----------|-------|
| Core Engine                       | 0.20   | 69        | Multi-objective solver with candidate generation and guardrails; debts unmodeled and legacy mapper still in use. |
| API Layer / Backend Routes        | 0.15   | 75        | Zod-validated App Router APIs for scan/sessions/simulate/cards/buckets/Vine; verification remains stubbed and some routes still map through legacy engine shapes. |
| Data Ingestion & Modeling         | 0.15   | 60        | Rich Prisma schema and MCC ingest/backfills; real bank/Vine data is simulated and device/merchant feeds are not yet live. |
| User-facing Web UI                | 0.20   | 68        | Dev-console style dashboard/scan/sessions/statements/history UIs with consistent Empty/Error states; assumes seeded data and lacks production onboarding. |
| Dev Console / Admin Tools         | 0.05   | 69        | Admin tooling (seed/clear), bank simulator, activity inspectors are implemented but lightly hardened. |
| Cherry Pass / Pre-Swipe           | 0.05   | 50        | Wallet pass scaffold gated at 501; manual scan flow works but no pass/App Clip entry yet. |
| Cherry Vine                       | 0.05   | 58        | Vine order ingest + simulator exist with optional HMAC; defaults keep signature enforcement off and hardware/state cleanup are TBD. |
| Security, Reliability, Ops        | 0.10   | 56        | NextAuth + withUser guards and integrity scripts in place; minimal monitoring/rate limits, verification is a no-op, and logging is coarse. |
| Documentation & Product Identity  | 0.05   | 84        | Canonical guardrail docs (AGENTS, vision/legal, API, audit) are current and aligned with code. |

### 3. Evidence and Observations

#### 3.1 Core Engine
- `lib/engine/solver.ts` runs the multi-objective pipeline (candidate generation → simulate → score → constraint enforcement) with traces and optional legacy decision mapping.
- Action space spans card use, paydown combos, delays, rejections, and merchant switch hints in `lib/engine/candidates.ts`; scoring profiles/weights live in `lib/engine/objective.ts`.
- State builder `lib/engine/context.ts` normalizes Prisma data and rolls buckets via `lib/buckets/periods.ts`/`lib/buckets-runtime.ts`, but debts are always empty and hard constraints are thin (`lib/engine/guardrails.ts`).
- Legacy compatibility remains via `lib/engine/legacy-mapper.ts`/`lib/engine/legacy.ts`, and tests cover solver/objective/invariants (`tests/engine-solver.test.js`, `tests/engine-objective.test.js`, `tests/engine-invariants.test.js`, `tests/engine-bucket-remaining.test.js`).

#### 3.2 API Layer / Backend
- Scan endpoint `app/api/scan/route.ts` validates with `lib/schemas/scan.ts`, resolves category, calls `safeSolveDecisionForUser`, and maps solver output to legacy shapes with invariants enforcement.
- Sessions lifecycle is fully implemented: creation `app/api/sessions/route.ts`, detail `app/api/sessions/[id]/route.ts`, confirm with anomaly tagging and bucket spend `app/api/sessions/[id]/confirm/route.ts`, verify with ledger status and optional reversal `app/api/sessions/[id]/verify/route.ts`.
- Simulations, cards, buckets, MCC, activity, seed/admin, and health routes are present and Zod-validated (`lib/schemas/*`, `app/api/*`), with user scoping via `lib/with-user.ts`/`lib/user-context.ts`.
- Vine ingest `app/api/vine/order/route.ts` accepts terminal or `OrderContext` payloads, enforces freshness and optional signature, and persists sessions through `lib/vine/run-recommendation.ts`.
- Wallet pass route `app/api/wallet/cherry-pass/route.ts` is gated to 501 via `lib/wallet/config.ts`; pass generation only runs when fully configured.

#### 3.3 Data Ingestion & Modeling
- Prisma models cover cards/reward rules, buckets with period windows, simulations, recommendation sessions, CherryPointLedger, VineDevice, MerchantObservation, and BankTransaction (`prisma/schema.prisma`).
- MCC ingestion/backfill scripts (`scripts/ingest-mcc.ts`, `scripts/backfill_category_preference_enum.ts`) and rollover utilities (`lib/buckets/ensure-fresh.ts`, `lib/buckets/periods.ts`) normalize data; integrity script logs anomalies (`scripts/audit-integrity.ts`).
- Bank and Vine data are stubbed/simulated: unified activity reads `prisma.bankTransaction` and ledger/simulation rows (`lib/unified-activity.ts`), and bank verification is mimicked in `app/bank-simulator/client.tsx`.

#### 3.4 User-facing Web UI
- Dev-console shell `app/layout.tsx` + `components/sidebar-nav.tsx` uses consistent primitives (`PageHeader`, `MetricCard`, `Panel`, `EmptyState`, `ErrorBanner`) across dashboard `app/page.tsx`, scan `app/scan/ScanClient.tsx`, sessions `app/sessions/*.tsx`, statements `app/statements/page.tsx`, history `app/history/page.tsx`, simulate `app/simulate/client.tsx`.
- Scan UI chains `/api/scan` → `/api/sessions` → confirm/verify with timers and error handling; sessions and activity pages surface verdicts and points status.
- Experiences assume seeded/demo data and basic sign-in; no production-grade onboarding, mobile tailoring, or external bank sync UX is present.

#### 3.5 Dev Console / Admin Tools
- Admin surface (`app/admin/page.tsx`, `app/admin/AdminClient.tsx`) drives seed/clear endpoints (`app/api/seed-demo/*`, `app/api/admin/*`) with user feedback states.
- Bank/Plaid simulator (`app/bank-simulator/client.tsx`) fronts `/api/dev/pending-sessions` to exercise verify/revoke flows; dev activity inspector at `app/dev/activity/page.tsx` complements the main activity feed `app/activity/page.tsx`.
- Tools are effective for local testing but lack auth scoping beyond general sign-in and have minimal auditing/limits.

#### 3.6 Cherry Pass / Pre-Swipe
- Wallet pass scaffold is present and gated: `app/api/wallet/cherry-pass/route.ts` checks `lib/wallet/config.ts` env/feature flag and is covered by `tests/wallet-pass-config.test.js`; default behavior is 501 with structured errors.
- Manual pre-swipe flow lives in `app/scan/ScanClient.tsx` and `/api/sessions`, providing advisory plus points without pass/App Clip entry.
- No pass assets/certs are bundled; enabling requires external provisioning and still positions pass as non-payment per `docs/wallet-pass.md`.

#### 3.7 Cherry Vine
- Vine ingest `app/api/vine/order/route.ts` maps terminal events via `lib/vine/order-context.ts` and persists sessions through `lib/vine/run-recommendation.ts` (legacy engine mapping); freshness checks exist but cleanup/expiry sweeps are TODO.
- Signature helper `lib/vine/security.ts` with mode flag (`CHERRY_VINE_SIGNATURE_MODE`) is tested (`tests/vine-security.test.js`), yet defaults to “off,” so enforcement is opt-in.
- Simulator UI `app/vine-simulator/client.tsx` exercises the route; hardware transport, nonce/HMAC defaults, and device lifecycle are still conceptual (`docs/cherry-vine.md`).

#### 3.8 Security, Reliability, Ops
- Auth via NextAuth (`app/api/auth/[...nextauth]/route.ts`) with `withUser` guard and lab-demo fallback (`lib/user-context.ts`); most APIs return 401 on missing auth.
- Logging is lightweight (`lib/logger.ts`); no rate limiting, structured telemetry, or monitoring hooks are wired. Admin/dev endpoints lack explicit environment gating beyond general auth.
- Verification orchestrator is a stub (`lib/verification/verify-session.ts`), so ledger posting depends on manual actions; Vine signatures default off, and wallet pass is safely gated but unmonitored.

#### 3.9 Documentation & Product Identity
- Guardrail docs (`AGENTS.md`, `docs/cherry-vision.md`, `docs/legal-constraints.md`) consistently enforce “copilot, not a card/terminal” and align with code behavior.
- API reference and audits (`docs/api.md`, `docs/cherry-core-loop-engine-vine-wallet-audit.md`) mirror implemented routes and known gaps; wallet/vine docs describe gating and non-payment positioning.
- README and repo structure docs (`README.md`, `docs/repo-structure.md`) are current and match observed layout and commands.

### 4. Highest-Leverage Next Steps

1. **Security/Ops — Automate verification and ledger posting**
   - Description: Implement real verification signals (bank/receipt/Vine) in `lib/verification/verify-session.ts` and trigger `/api/sessions/[id]/verify` to move PENDING ledger rows automatically, reducing manual bank-simulator reliance.
   - Impact:
     - Beta: +5 points (approx.)
     - v1: +8 points (approx.)
   - Pointers: `lib/verification/verify-session.ts`, `app/api/sessions/[id]/verify/route.ts`, `app/bank-simulator/client.tsx`

2. **Cherry Vine — Enforce signatures and lifecycle hygiene**
   - Description: Turn on enforced signature mode by default, seed device secrets, and add token expiry/cleanup for Vine-created sessions to curb spoofed contexts.
   - Impact:
     - Beta: +3 points (approx.)
     - v1: +5 points (approx.)
   - Pointers: `app/api/vine/order/route.ts`, `lib/vine/security.ts`, `scripts/cleanup_expired_vine_sessions.ts`

3. **Core Engine — Expand constraints and unify solver usage**
   - Description: Model debts/liquid buffers in `lib/engine/context.ts`, tighten hard/soft guardrails in `lib/engine/guardrails.ts`, and route Vine/session mapping through solver traces instead of legacy `runEngine` to avoid drift.
   - Impact:
     - Beta: +4 points (approx.)
     - v1: +6 points (approx.)
   - Pointers: `lib/engine/context.ts`, `lib/engine/guardrails.ts`, `lib/vine/run-recommendation.ts`

4. **Data Ingestion — Add real bank/feed ingestion**
   - Description: Replace bank-simulator-only flow with a real transaction ingest (webhook or polling) to populate `BankTransaction`/`MerchantObservation` and drive automated verification and history/statement views.
   - Impact:
     - Beta: +6 points (approx.)
     - v1: +10 points (approx.)
   - Pointers: `prisma/schema.prisma`, `lib/unified-activity.ts`, `app/history/page.tsx`

5. **Cherry Pass — Ship gated pass generation flow**
   - Description: When certs are available, keep gating but enable `CHERRY_WALLET_PASS_ENABLED=true` paths end-to-end with pass assets, deep links, and tests, ensuring advisory-only positioning.
   - Impact:
     - Beta: +2 points (approx.)
     - v1: +4 points (approx.)
   - Pointers: `app/api/wallet/cherry-pass/route.ts`, `lib/wallet/cherryPass.ts`, `docs/wallet-pass.md`

6. **User Web UI — Prep for non-dev cohorts**
   - Description: Add onboarding/auth cues, mobile responsiveness, and clearer empty/error states for real data (e.g., missing bank link vs. seed prompt) so the console can face friends-and-family users.
   - Impact:
     - Beta: +2 points (approx.)
     - v1: +4 points (approx.)
   - Pointers: `app/page.tsx`, `app/scan/ScanClient.tsx`, `app/statements/page.tsx`

7. **Security/Ops — Add observability and API limits**
   - Description: Introduce structured logging/metrics, basic rate limiting on public APIs, and stricter auth gates on admin/dev endpoints to reduce abuse risk in shared environments.
   - Impact:
     - Beta: +3 points (approx.)
     - v1: +6 points (approx.)
   - Pointers: `app/api/admin/*`, `app/api/*`, `lib/logger.ts`

### 5. Meta

- Assessment agent: Codex (GPT-5)
- Branch: `main`
- Notes: documentation and supporting code were updated in this pass (bank ingest, verification wiring, Vine solver mapping).

## [2025-12-02] Bank ingest & verification progress note

- Added dev-only bank ingest boundary (`/api/dev/bank/ingest`) with idempotent upsert into `BankTransaction` plus admin UI hooks to seed/inspect rows; unified activity/statements now consume real ingested transactions when present.
- Wired verification core (`verifySessionFromSignal`) into `/api/sessions/[id]/verify` and new `/api/dev/verification/trigger`, including bucket reversal on rejection and tests; auto-trigger from ingest remains a follow-up.
- Vine order recommendations now run through the solver (`safeSolveDecisionForUser`) before legacy mapping; guardrails tightened for strict buckets.
- New docs: `docs/bank-ingest-notes.md`, `docs/verification-flow.md`; README/AGENTS updated with status/priorities.
