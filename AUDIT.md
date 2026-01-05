Status: Active
Last updated: 2026-01-03

# Cherry Audit Log

## Current behavior
- New audit entries must follow `docs/audit-format.md` and the guidance below.

> For agents: see `docs/audit-format.md` for the canonical audit schema and required sections.

## Audit Format Notes (for agents)

- Each new audit section MUST begin with a JSON code block containing:
  - `audit_type`, `audit_version`, `date`
  - `git.branch`, `git.commit`, `git.dirty`
  - `completion.beta`, `completion.v1`
  - `subsystems` (matching the table keys)
- After the JSON block, the human-readable summary and tables follow.
- Do NOT rename subsystem keys without updating this note.

### Delta Section Requirements (for agents)

Every new audit MUST include a `### 1.b Delta since previous audit` section that:

1. Locates the most recent prior audit in this file.
2. Extracts:
   - Previous `completion_beta` and `completion_v1`.
   - Previous subsystem scores.
3. Emits a table:

| Subsystem   | Prev (%) | Now (%) | Δ | Notes |
|------------|----------|---------|---|-------|

4. Adds a short bullet list summarizing:
   - Any subsystem with |Δ| ≥ 5.
   - Any newly introduced or removed subsystem.

### Risk Register Requirements (for agents)

The Risk Register is a mandatory control surface used to track unresolved threats to correctness, legality, and pilot safety.

Each audit MUST include a `### 5. Risk Register` section with:

1. A table:

| ID | Title                           | Subsystem   | Likelihood | Impact | Status  | Notes |
|----|---------------------------------|------------|-----------|--------|--------|-------|

2. Conventions:
   - `Likelihood`: LOW / MEDIUM / HIGH
   - `Impact`: LOW / MEDIUM / HIGH / CRITICAL
   - `Status`: OPEN / MITIGATING / CLOSED / ACCEPTED

3. At least 5 rows, focusing on:
   - Security/ops gaps
   - Data integrity / correctness risks
   - Product identity / legal guardrails
   - Engine decision quality
   - UX/behavioral confusion for users

4. IDs are stable short strings, e.g. `SEC_RATE_LIMIT`, `ENG_DEBT_MODEL`, `VINE_SIGS`.

## Audit Mindset (non-negotiable)

- Audits are conservative by default; absence of evidence is scored as absence of maturity.
- Scores must be comparable across time; do not reward effort, only observable behavior.
- If prior scores appear inflated or inconsistent, correct them and note the change in Delta.

### Handoff & Questions Requirements (for agents)

Every audit MUST include:

1. `### 6. Handoff Notes for Next Agent`
   - 3–10 bullets, each starting with a tag:
     - `[CONTEXT]` stable background facts worth repeating.
     - `[GOTCHA]` non-obvious traps (e.g., legacy mappers still in use).
     - `[WORKFLOW]` how to safely run local flows (seed, simulate, verify).

2. `### 7. Open Questions for Human`
   - 3–10 bullets, phrased as direct questions to the maintainer (Moustafa), e.g.:
     - “Do you want Vine to be mandatory for any cohort before v1?”
     - “What is the minimum viable verification signal you’re comfortable shipping with?”

These sections exist specifically to make handoff between different LLMs and humans easy.

### Subsystem Key Mapping (for agents)

Use these canonical keys:

- `core_engine` ↔ “Core Engine”
- `api_layer` ↔ “API Layer / Backend Routes”
- `data_ingestion_modeling` ↔ “Data Ingestion & Modeling”
- `user_web_ui` ↔ “User-facing Web UI”
- `dev_console_admin` ↔ “Dev Console / Admin Tools”
- `cherry_pass` ↔ “Cherry Pass / Pre-Swipe”
- `cherry_vine` ↔ “Cherry Vine”
- `security_ops` ↔ “Security, Reliability, Ops”
- `docs_product_identity` ↔ “Documentation & Product Identity”

Rules:

- JSON uses snake_case keys.
- Tables/headings use the human labels.
- Do NOT invent new keys without updating this mapping.

### Scoring Rationale Requirements (for agents)

For each subsystem, include in `### 3. Evidence and Observations`:

- At least 3 bullets.
- Each bullet must:
  - Reference specific files or modules, e.g. `lib/engine/solver.ts`, `app/api/scan/route.ts`.
  - Indicate whether the evidence supports a HIGH, MEDIUM, or LOW maturity judgment.

Example pattern:

- `lib/engine/solver.ts` integrates candidate generation, simulation, and scoring but still calls legacy mapper → MEDIUM maturity (core present, migration incomplete).

Goal: a new agent can recompute or challenge scores from concrete evidence instead of accepting them blindly.

Subsystem weights reflect user harm potential and blast radius, not implementation difficulty.

### Behavioral Guidelines (for agents)

- Be conservative. Prefer underestimating maturity to overestimating.
- Only give credit for behavior on `main`, not feature branches.
- If you cannot verify something from code/docs, say so in the Evidence section.
- Never change scoring weights or add/remove subsystems without:
  - Updating the JSON schema example.
  - Updating the Subsystem Key Mapping.
  - Noting the change in the next `Delta since previous audit` section.

## Future/Target behavior
- Keep audit entries consistent with `docs/audit-format.md` and update the format doc if the schema evolves.

## Related docs
- `docs/audit-format.md`
- `docs/system-overview.md`

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
- MCC ingestion/backfill scripts (`scripts/ingest-mcc.mts`, `scripts/backfill_category_preference_enum.mts`) and rollover utilities (`lib/buckets/ensure-fresh.ts`, `lib/buckets/periods.ts`) normalize data; integrity script logs anomalies (`scripts/audit-integrity.mts`).
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
   - Pointers: `app/api/vine/order/route.ts`, `lib/vine/security.ts`, `scripts/cleanup_expired_vine_sessions.mts`

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

```json
{
  "audit_type": "repository_completion",
  "audit_version": 2,
  "date": "2025-12-02",
  "git": {
    "branch": "main",
    "commit": "c11b049",
    "dirty": true
  },
  "completion": {
    "beta": 67,
    "v1": 67
  },
  "subsystems": {
    "core_engine": 69,
    "api_layer": 76,
    "data_ingestion_modeling": 60,
    "user_web_ui": 68,
    "dev_console_admin": 69,
    "cherry_pass": 50,
    "cherry_vine": 58,
    "security_ops": 58,
    "docs_product_identity": 86
  }
}
```

## [2025-12-02] Repository-wide Completion Assessment (v2)

### 1. Summary

- Completion_beta: 67%
- Completion_v1: 67%
- Method: full-repo ingestion against v2 audit format; recomputed subsystem scores post-refactor.

### 1.b Delta since previous audit

| Subsystem                        | Prev (%) | Now (%) | Δ  | Notes |
|----------------------------------|----------|---------|----|-------|
| Core Engine                      | 69       | 69      | 0  | Engine unchanged; legacy mapper still present. |
| API Layer / Backend Routes       | 75       | 76      | 1  | Simulate route tightened with parseJsonBody/commit flag; schemas strict. |
| Data Ingestion & Modeling        | 60       | 60      | 0  | No new real ingest; dev-only ingest unchanged. |
| User-facing Web UI               | 68       | 68      | 0  | UI unchanged; still dev-console centric. |
| Dev Console / Admin Tools        | 69       | 69      | 0  | Admin unchanged. |
| Cherry Pass / Pre-Swipe          | 50       | 50      | 0  | Still gated 501. |
| Cherry Vine                      | 58       | 58      | 0  | No new auth/cleanup; solver mapping already done. |
| Security, Reliability, Ops       | 56       | 58      | 2  | Zod strict linting, request.json bans, and Tailwind conflict checks increased hygiene. |
| Documentation & Product Identity | 84       | 86      | 2  | Added audit format spec (`docs/audit-format.md`) and stricter agent notes. |

- Δ≥5: none.

### 2. Subsystem Scores

| Subsystem                         | Weight | Score (%) | Notes |
|-----------------------------------|--------|-----------|-------|
| Core Engine                       | 0.20   | 69        | Solver intact; debts still unmodeled; legacy mapper required for payloads. |
| API Layer / Backend Routes        | 0.15   | 76        | Strict Zod schemas, parseJsonBody enforcement, simulate commit flag guarded to non-prod. |
| Data Ingestion & Modeling         | 0.15   | 60        | Only dev ingest; no real bank/Vine feeds; schema stable. |
| User-facing Web UI                | 0.20   | 68        | Dev-console UX stable; no production onboarding/mobile polish. |
| Dev Console / Admin Tools         | 0.05   | 69        | Admin/bank simulator unchanged; still minimal auth hardening. |
| Cherry Pass / Pre-Swipe           | 0.05   | 50        | Wallet pass remains 501-gated; no new assets/certs. |
| Cherry Vine                       | 0.05   | 58        | Signature helper exists but defaults off; no lifecycle/cleanup. |
| Security, Reliability, Ops        | 0.10   | 58        | Zod strict linting, request.json restrictions, Tailwind conflict enforcement; still no rate limiting/observability. |
| Documentation & Product Identity  | 0.05   | 86        | New audit-format spec and agent notes improve consistency; vision/legal docs current. |

### 3. Evidence and Observations

#### 3.1 Core Engine
- `lib/engine/solver.ts` remains the primary pipeline (generate/simulate/score/enforce) → MEDIUM maturity; no debt modeling and legacy mapping persists.
- `lib/engine/context.ts` rolls buckets via `applyInMemoryRollover`/`toBucketRuntime` but leaves debts empty and constraints thin → MEDIUM maturity.
- `lib/engine/legacy-mapper.ts` still required to surface legacy payloads → LOW-MEDIUM maturity until callers fully move to solver outputs.

#### 3.2 API Layer / Backend
- `app/api/simulate/route.ts` now parses via `parseJsonBody`/strict schema and adds guarded `commit` path for dev-only bucket increments → MEDIUM-HIGH maturity.
- `app/api/vine/order/route.ts` uses unified validation with `VinePayloadSchema` and signature verification optional → MEDIUM; auth remains opt-in.
- `app/api/dev/verification/trigger/route.ts` now Zod-parsed and reuses verification signal flow → MEDIUM maturity with explicit validation.

#### 3.3 Data Ingestion & Modeling
- `lib/bank/ingest.ts` remains dev-only upsert; no webhook/provider auth → LOW-MEDIUM.
- `prisma/schema.prisma` stable; `BankTransaction`/`MerchantObservation` unused by real feeds → MEDIUM for modeling, LOW for live ingest.
- `lib/unified-activity.ts` reads bank/ledger/simulated rows; bank rows only exist when seeded → MEDIUM maturity.

#### 3.4 User-facing Web UI
- `app/simulate/client.tsx` now offers optional commit checkbox (dev/local) but UI remains lab-focused → MEDIUM.
- `app/scan/ScanClient.tsx`, `app/sessions/*.tsx` unchanged: solid dev-console flows, no production onboarding/mobile polish → MEDIUM.
- `app/page.tsx` dashboard relies on seeded/demo data; no real-time auth/onboarding cues → MEDIUM.

#### 3.5 Dev Console / Admin Tools
- `app/admin/AdminClient.tsx` still exposes seed/clear + bank ingest debug with general auth only → MEDIUM.
- `app/bank-simulator/client.tsx` continues manual verification simulation; no provider webhook flow → MEDIUM.
- Tailwind conflict lint now enforced, improving DX hygiene → MEDIUM-HIGH.

#### 3.6 Cherry Pass / Pre-Swipe
- `app/api/wallet/cherry-pass/route.ts` still 501-gated via env/flag; `lib/wallet/config.ts` unchanged → LOW-MEDIUM.
- No pass assets or certs added; remains advisory-only scaffold → LOW.
- Docs (`docs/wallet-pass.md`) still describe 501 gating → consistent but maturity LOW-MEDIUM.

#### 3.7 Cherry Vine
- `app/api/vine/order/route.ts` uses solver mapping but signature enforcement optional; freshness window present → MEDIUM.
- `lib/vine/security.ts` supports HMAC with modes, default off → MEDIUM-LOW for security posture.
- Simulator UI unchanged; no device lifecycle/cleanup scripts → LOW-MEDIUM.

#### 3.8 Security, Reliability, Ops
- ESLint now includes `eslint-plugin-zod` with strict schemas; `eslint.config.mjs` bans direct `request.json()` in APIs → MEDIUM improvement.
- Tailwind conflict script now strict and fails on conflicts → MEDIUM hygiene.
- Still no rate limiting, structured telemetry, or production observability; admin/dev routes lack env gating → LOW-MEDIUM overall.

#### 3.9 Documentation & Product Identity
- New `docs/audit-format.md` plus `AUDIT.md` agent notes standardize future audits → HIGH for audit process alignment.
- Core identity/legal docs unchanged and still enforced in AGENTS/README → HIGH alignment.
- API/legal guardrails remain explicit in `docs/api.md`, `docs/legal-constraints.md` → HIGH.

### 4. Highest-Leverage Next Steps

1. **Security/Ops — Add rate limiting and basic observability**
   - Description: Introduce middleware or API-level rate limits and structured logging/metrics for public routes; add minimal dashboards for errors/latency.
   - Impact:
     - Beta: +4 points (approx.)
     - v1: +7 points (approx.)
   - Pointers: `app/api/*`, `lib/logger.ts`

2. **Verification — Automate signal processing**
   - Description: Wire bank/Vine/receipt signals into `verifySessionFromSignal` via a worker/queue; auto-move PENDING ledger rows to POSTED/REVOKED.
   - Impact:
     - Beta: +5 points (approx.)
     - v1: +8 points (approx.)
   - Pointers: `lib/verification/verify-session.ts`, `app/api/sessions/[id]/verify/route.ts`

3. **Vine Security — Enforce signatures + cleanup**
   - Description: Default `CHERRY_VINE_SIGNATURE_MODE=enforce`, manage device secrets, and add token/nonce cleanup for Vine sessions.
   - Impact:
     - Beta: +3 points (approx.)
     - v1: +5 points (approx.)
   - Pointers: `lib/vine/security.ts`, `app/api/vine/order/route.ts`, `scripts/cleanup_expired_vine_sessions.mts`

4. **Data Ingestion — Real bank feed webhook**
   - Description: Add authenticated provider webhook/polling to populate `BankTransaction`/`MerchantObservation` and flow into verification/history.
   - Impact:
     - Beta: +6 points (approx.)
     - v1: +10 points (approx.)
   - Pointers: `lib/bank/ingest.ts`, `lib/unified-activity.ts`, `prisma/schema.prisma`

5. **Engine — Debt/liquidity modeling and guardrails**
   - Description: Implement debt/liquidity in `lib/engine/context.ts` and stronger guardrails in `lib/engine/guardrails.ts`; remove legacy mapper dependency where possible.
   - Impact:
     - Beta: +4 points (approx.)
     - v1: +6 points (approx.)
   - Pointers: `lib/engine/context.ts`, `lib/engine/guardrails.ts`, `lib/engine/legacy-mapper.ts`

6. **Cherry Pass — Ready the gated flow**
   - Description: Keep 501 gate but add cert/asset plumbing and tests so enabling is predictable and still advisory-only.
   - Impact:
     - Beta: +2 points (approx.)
     - v1: +4 points (approx.)
   - Pointers: `app/api/wallet/cherry-pass/route.ts`, `lib/wallet/cherryPass.ts`, `docs/wallet-pass.md`

7. **Dev/Admin Hardening**
   - Description: Add role/env gating to admin/dev endpoints and bank ingest debug; reduce risk of misuse in shared envs.
   - Impact:
     - Beta: +3 points (approx.)
     - v1: +5 points (approx.)
   - Pointers: `app/api/admin/*`, `app/api/dev/*`, `app/admin/AdminClient.tsx`

### 5. Risk Register

| ID                 | Title                                   | Subsystem             | Likelihood | Impact   | Status    | Notes |
|--------------------|-----------------------------------------|-----------------------|------------|----------|-----------|-------|
| SEC_RATE_LIMIT     | Missing public API rate limits          | security_ops          | HIGH       | HIGH     | OPEN      | No throttling on API routes; susceptible to abuse. |
| VERIF_AUTOMATION   | Verification signals not automated      | security_ops          | MEDIUM     | HIGH     | OPEN      | Ledger relies on manual triggers; fraud/accuracy risk. |
| ENG_DEBT_MODEL     | Debt/liquidity unmodeled                | core_engine           | MEDIUM     | HIGH     | OPEN      | Engine lacks debt/liquidity guardrails; scoring incomplete. |
| DATA_REAL_FEEDS    | No real bank feed ingestion             | data_ingestion_modeling | HIGH     | HIGH     | OPEN      | Only dev ingest; history/verification depend on real data. |
| VINE_SIGS          | Vine signatures optional/off by default | cherry_vine           | MEDIUM     | MEDIUM   | OPEN      | Spoofing risk without enforced signature/nonce cleanup. |
| PASS_501_GUARD     | Wallet pass remains gated but fragile   | cherry_pass           | LOW        | MEDIUM   | MITIGATING | Relies on env/flag; ensure guard stays on until certs ready. |

### 6. Handoff Notes for Next Agent

- [CONTEXT] Simulate now supports a `commit` flag for dev/local only; in production commits are ignored.
- [CONTEXT] Tailwind conflict lint and Zod strict lint are enforced; `request.json()` is banned in API routes.
- [GOTCHA] Legacy engine mapper still required for API payload shapes; removing it needs coordinated mapping updates.
- [GOTCHA] Vine signature enforcement defaults to off; do not assume auth on `/api/vine/order`.
- [WORKFLOW] To test advisory flow: seed demo → `/scan` to create session → `/sessions/[id]/confirm` → `/api/sessions/[id]/verify` (or bank simulator).
- [WORKFLOW] Dev bank ingest: use `/api/dev/bank/ingest` (auth) with JSON payload; verify via admin “Bank ingest debug”.

### 7. Open Questions for Human

- Do you want Vine signature enforcement enabled by default for all environments?
- What minimum verification signal is acceptable for auto-posting ledger rows (bank webhook, Vine match, receipts)?
- Should the simulate `commit` path ever be allowed in staging/prod, or remain dev-only?
- Is there a target provider for real bank ingest (Plaid, direct webhook), or should we design a generic adapter?
- Are rate limits required before any external demo, and what thresholds are acceptable?
