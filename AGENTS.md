Status: Active
Last updated: 2025-12-02

# Cherry Agents — Canonical Operating Guide

This file is the authoritative playbook for any AI/copilot working in this repo. It must stay aligned with:
- `docs/cherry-vision.md` (product identity)
- `docs/legal-constraints.md` (hard legal guardrails)
- `docs/cherry-vine.md` (hardware/context)
- `docs/wallet-pass.md` (Apple Wallet scaffold and 501 gate)
- `docs/api.md` (API reference including `/api/scan`)
- `docs/repo-structure.md` (canonical layout)
- `docs/cherry-core-loop-engine-vine-wallet-audit.md` (core loop/engine/Vine/wallet audit)
- `README.md` (setup/commands)

---

## Product Identity & Guardrails (never violate)
- Cherry is a **real-time spending copilot**, not a card, proxy, processor, or payment terminal. It never fronts transactions, holds funds, or touches payment rails.
- Cherry’s loop is **Observe → Evaluate → Recommend → Reward**. Nothing beyond that (no authorization or routing).
- Cherry Vine is a **context beacon** (merchant + amount + timestamp over BLE/NFC), not an EMV device or reader. It never accepts taps/swipes/PIN.
- Cherry Pass is a **storeCard-style Wallet pass** that triggers advisory flows; it is not a payment instrument. `GET /api/wallet/cherry-pass` returns **501** until Apple Wallet certs exist and the feature flag is enabled.
- Recommendation sessions and Cherry Points are **advisory/sandbox**. `RecommendationSession` + `CherryPointLedger` record what was suggested and what the user claims; they do not settle money.
- Verification is layered and simulated today; anomalies are diagnostic only (not fraud labels).
- When in doubt, read `docs/legal-constraints.md` and choose the legally conservative path.

Forbidden framings: “fronting card,” “proxy BIN,” “tap to pay with Cherry,” “Cherry terminal,” “payment card.”

---

## Completion snapshot (2025-12-02)
- Audit places the repo at ~66% of a v1-quality product. Lab flows are solid; production gaps remain.
- Highest priorities: real bank ingest (now scaffolded via `/api/dev/bank/ingest`), automated verification/ledger posting, enforced Vine signatures/lifecycle, observability/rate limits.
- Cherry Pass stays gated at 501; Vine remains context-only; never imply payment/processing.

---

## Canonical Docs Index
- Identity & legal: `docs/cherry-vision.md`, `docs/legal-constraints.md`
- Hardware/context: `docs/cherry-vine.md`
- Wallet pass: `docs/wallet-pass.md`
- API surface: `docs/api.md`
- Buckets/rollover: `docs/buckets-rollover-plan.md`
- System map: `docs/master.md`
- Repo layout: `docs/repo-structure.md`
- Auth architecture: `docs/architecture/auth.md`
- Sign-in tasks: `docs/signin-tasks.md`
- Agent rules: this file + `.github/copilot-instructions.md`

Agents must consult relevant docs before changing code. For directory layout, see `docs/repo-structure.md` and treat it as authoritative.

---

## Product Identity Guardrails (never violate)
- Cherry is a **real-time spending copilot**, not a card, proxy, processor, or payment terminal. It never fronts transactions, holds funds, or touches payment rails.
- Cherry’s loop is **Observe → Evaluate → Recommend → Reward**. Nothing beyond that (no authorization).
- Cherry Vine is a **context beacon** (merchant + amount + timestamp over BLE/NFC), not an EMV device or reader.
- Cherry Pass is a **storeCard-style Wallet pass** that triggers advisory flows; it is not a payment instrument. `GET /api/wallet/cherry-pass` returns **501** until Apple Wallet certs exist.
- Recommendation sessions and Cherry Points are **advisory/sandbox**. `RecommendationSession` + `CherryPointLedger` record what was suggested and what the user claims; they do not settle money.
- Verification is layered and simulated today; anomalies are diagnostic only (not fraud labels).

Forbidden framings: “fronting card,” “proxy BIN,” “tap to pay with Cherry,” “Cherry terminal,” “payment card.”

---

## Repository Map (authoritative paths)
- App Router UI: `app/` (server-first; add `"use client"` only where browser state is needed).
- Core APIs: `app/api/*`
  - `/api/scan` — stateless advisory (pre-swipe) using `lib/engine.ts`; no persistence.
  - `/api/sessions` + `/api/sessions/[id]/confirm|verify` — persist recommendations and Cherry Points claims.
  - `/api/vine/order` — Vine simulator/device order ingestion → session creation (dev-only today).
  - `/api/wallet/cherry-pass` — Wallet pass scaffold; returns 501 until certs configured.
- Shared logic:
  - `lib/engine.ts` + `lib/engine-invariants.ts` — canonical engine, verdicts, incentives.
  - `lib/enums.ts` — enum aliases mirroring Prisma `$Enums`.
  - `lib/validation/*` — Zod schemas; all routes must parse inputs through these.
  - `lib/vine/*` — `order-context`, `run-recommendation` (session from Vine order).
  - `lib/verification/*` — stubs for bank/receipt/vine verification orchestrator.
  - `auth.ts`, `prisma.ts`, `with-user.ts`, `logger.ts` — auth/session helpers, Prisma client, guard, logging.
- Database schema: `prisma/schema.prisma`; migrations under `prisma/migrations`; helper scripts in `prisma/scripts/`.
- Data imports: `data/mcc/`; ingestion scripts in `scripts/`.
- Public assets: `public/`; extra docs under `docs/`.

---

## Architecture Snapshot (code-level reality)
- Frontend: Next.js 16 App Router + React 19, Tailwind tokens in `app/globals.css`. Sidebar layout in `app/layout.tsx` loads Geist fonts and session provider.
- Auth: NextAuth (PrismaAdapter) in `app/api/auth/[...nextauth]/route.ts`. `withUser` enforces auth on API routes. Client code uses `useSession()`/`signIn()` and handles `401` by prompting sign-in.
- Engine: `lib/engine.ts` is the single source of decision logic. Always call it; do not fork logic in routes.
- Persistence:
  - `Bucket`, `Card`, `RewardRule` describe user budgets and rewards.
  - `RecommendationSession` stores advisory decisions (manual scan or Vine) plus offered points and verdicts.
  - `CherryPointLedger` records points movements (PENDING/POSTED/REVOKED) and anomaly flags.
- Dev utilities: `/admin` triggers clear/seed endpoints; `/vine-simulator` exercises `/api/vine/order`.

---

## Build, Test, and Run
- Install: `npm install`
- Dev server: `npm run dev` (Next.js, defaults to :3000).
- Build/start: `npm run build` then `npm run start`.
- Health gates:
  - `npm run lint` (type-aware ESLint)
  - `npm run typecheck`
  - `npm run typecheck:scripts` (if defined)
  - `npm run check` (composite)
- Prisma hygiene:
  - `npx prisma migrate dev --name <desc>` for schema changes.
  - `npx prisma generate` after schema edits.
  - `npx prisma studio` to inspect data.
- Auth for curl/CLI: `./scripts/dev-login.sh [email]` → `cookies.txt`; pass with `-b cookies.txt`.
- Data: `npm run ingest:mcc` to populate MCC map; `npm run seed:demo` to seed demo cards/buckets/sessions/ledger rows.

---

## Operating Rules for Agents
- **Always anchor to canonical docs** (Vision, Vine, Wallet, API/scan). If code diverges legally, treat as debt to fix in code, not docs.
- **Validate inputs with Zod** schemas from `lib/validation/*`; never trust raw `request.json()`.
- **No new Prisma clients**; import from `@/lib/prisma`.
- **Keep server-first**; mark client components explicitly.
- **Respect advisory boundaries**: `/api/scan` is stateless; sessions/ledger handle persistence and rewards; wallet pass stays 501 until certs exist; Vine is context-only.
- **Handle 401s intentionally** in UI (prompt sign-in) and in API tests (provide cookies).
- **Testing mindset**: prefer focused unit tests for engine invariants, session/ledger lifecycle, and MCC mapping. Keep lint/typecheck green.
- **Banned changes**: do not turn Cherry into a payment card/terminal; do not bypass the Wallet 501 gate; do not store or process sensitive card data.

## Bucket Model & Invariants
- Canonical balance fields: `budgetAmount` (limit), `spentCents` (posted), optional `pendingSpendCents` (not stored yet), `committedCents = posted + pending`, `remainingCents = max(0, limit - committed)`.
- Single source of truth: `lib/buckets-runtime.ts`. Engine, seeds/admin scripts, and UI/API surfaces must use this helper (or wrappers around it) instead of ad hoc math.
- `currentAmount` is legacy and only mirrors `remainingCents` on write; never treat it as authoritative input.
- Guardrails and over-limit checks must compare against `remainingCents`, not raw `limitCents`. `/api/buckets` should return runtime buckets with derived balance fields.

---

## Dev Console Layout & Components
- Shell lives in `app/layout.tsx` + `components/sidebar-nav.tsx` + `components/dev-console-header.tsx`. Sidebar groups are **Spend & data**, **Setup**, **Engine**, and **Hardware & tools**; keep new pages in those buckets.
- Page pattern: `PageHeader` → metric row (`MetricCard`) → panelized content (`Panel`) with consistent spacing. Keep headers semantic (`h1` per page, `h2` per section).
- Shared UI primitives live under `components/ui/*`: `PageHeader`, `MetricCard`, `Panel`, `EmptyState`, `ErrorBanner`, `LoadingRows`/`LoadingMetricGrid`. Prefer these over ad hoc empty/loading/error text.
- Engine-first surfaces (Dashboard, Statements, Scan, Sessions, Vine, Admin) should expose backend context and use the same header/metric/panel vocabulary; avoid bespoke layouts unless required by data.
- Buckets, Cards, History/Activity, and Simulations also follow the same header → metrics → panels pattern; data-heavy areas use `LoadingRows`/`LoadingMetricGrid` during fetch and `ErrorBanner` for failures.
- `/history` is spend history (transactions/statement-derived timeline). `/activity` is engine activity (sessions/ledger/engine events) and lives under the Engine section of the sidebar.

---

### Empty states
- Use the single shared `EmptyState` component from `components/ui/empty-state.tsx` (or `EmptyList` when inside `<ul>`). Do not inline custom “No X yet” markup.
- If an action is needed, pass `actionLabel` + `onAction`/`actionHref` or `actionNode`; avoid bespoke CTA layouts.

## Editor Tooling Defaults
- VS Code in this repo is configured via `.vscode/settings.json`; do not override the shared workspace config.
- Tailwind CSS IntelliSense treats `cssConflict` diagnostics as **errors**. Resolve conflicts (e.g., duplicate `focus-visible:outline*` utilities) instead of downgrading the rule.
- If Tailwind linting seems out of sync, run “Developer: Reload Window” in VS Code so the extension reloads the workspace settings.

---

## Quick File Pointers (per surface)
- Manual advisory: `app/scan/ScanClient.tsx` → `/api/sessions` (creates session) and `/api/sessions/[id]/confirm`.
- Vine simulator: `app/vine-simulator/page.tsx` + `client.tsx` → `/api/vine/order`.
- Engine: `lib/engine/*` (types/solver/context/guardrails/objective/simulate/candidates), legacy shim in `lib/engine/legacy.ts`, invariants in `lib/engine-invariants.ts`, enums in `lib/enums.ts`.
- Simulations: `/api/simulate` must use the canonical engine (`safeSolveDecisionForUser` in `lib/engine/solver.ts`); `lib/simulation.ts` is legacy/archived and must not be used for new flows.
- Category preferences: `CategoryPreference.category` is a `RewardCategory` enum; do not store free-form strings. Use Zod enum validation on write paths.
- Buckets: balances are derived via `lib/buckets-runtime.ts` (`budgetAmount`, `spentCents` → `committedCents`/`remainingCents`); `currentAmount` is legacy-only.
- Wallet pass scaffold: `app/api/wallet/cherry-pass/route.ts`, `lib/wallet/cherryPass.ts` (returns 501 without certs).
- API reference: `docs/api.md` (keep in sync when endpoints change).
- Product identity: `docs/cherry-vision.md` (copilot, not a card).
- Hardware blueprint: `docs/cherry-vine.md` (context beacon).
- Wallet pass status: `docs/wallet-pass.md` (501 until certs).

---

## Cherry Engine — Solver Architecture
- Pure solver: `EngineState` (normalized user state) + `EngineContext` (payload) → ranked `EngineDecision[]` with scores, reasons, projections, and constraint tags.
- State model lives in `lib/engine/types.ts`: `NormalizedCard`, `RewardRule`, `Bucket`, `DebtAccount`, `UserConstraints`, `WorldParams`. Do not leak Prisma models into solver logic.
- State/Context builders: `fromPrismaUserToEngineState(userId)` maps DB → engine state; `fromExternalContextToEngineContext(payload)` maps HTTP/extension/Vine payloads → engine context.
- Pipeline: `generateCandidateActions` → `simulateAction` → `scoreDecision` (`objective.ts`) → `evaluateConstraintsForDecision`/`enforceHardConstraints` → sorted output. Orchestrated by `solveDecision`; API-safe wrapper is `safeSolveDecisionForUser`.
- Legacy compatibility (`runEngine`, card/bucket verdicts) is isolated in `lib/engine/legacy.ts` for now; new surfaces must consume `safeSolveDecisionForUser` and map `EngineDecision` to their payloads.
- Add new action types or scoring tweaks in `lib/engine/objective.ts`, `lib/engine/candidates.ts`, `lib/engine/simulate.ts`, and keep `lib/engine-invariants.ts` updated when outputs change. Engine failures must degrade gracefully (structured errors/no recommendation) rather than crashing routes.
- API usage: `/api/simulate`, `/api/scan`, and `/api/sessions` all route through `safeSolveDecisionForUser` with context builders; mapping back to legacy response shapes happens via helpers (e.g., `mapSolverDecisionToLegacyDecision`).

### Engine multi-objective scoring
- Components (`ObjectiveComponentScores`): `rewards`, `runway`, `debtRelief`, `volatility`, `ruleViolations` (positive volatility/violations are penalties).
- Weights (`ObjectiveWeights`): non-negative weights for each component; defaults mirror the balanced profile. Profiles: `MAX_REWARDS`, `KILL_DEBT`, `DONT_GO_BROKE`, `BALANCED`.
- Per-user control: stored on `User.engineObjectiveProfile` + optional JSON overrides in `User.engineObjectiveWeights`. Mapped to `EngineState.preferences` and merged via `getObjectiveWeightsForState` with clamping of invalid/negative/NaN values.
- Scoring: `scoreDecision` in `lib/engine/objective.ts` computes component scores and scalar utility as `rewards*w.rewards + runway*w.runway + debtRelief*w.debtRelief - volatility*w.volatility - ruleViolations*w.ruleViolations`. Components and weights are attached to traces; `/api/simulate` response shape stays the same.
- Guardrails: unknown profiles fall back to `BALANCED` with a warning; malformed overrides are ignored; scoring must fail soft (log + defaults) rather than throwing.

### Engine logging
- Centralized via a small helper inside `safeSolveDecisionForUser`; validation errors log as warnings, unexpected errors log as errors.
- Logging is suppressed entirely when `NODE_ENV=test` to avoid noise from expected failure tests.
- Do not add ad-hoc `console.error`/`console.warn` in API routes for engine failures; use the engine logger flow instead.

---

### Engine decision vocabulary
- Action types include: `USE_CARD`, `USE_CARD_WITH_PAYDOWN`, `DELAY_PURCHASE`, `REJECT_PURCHASE`, `SWITCH_MERCHANT`, and `PAY_DOWN_DEBT`.
- `generateCandidateActions(state, ctx)` enumerates allowed actions based on state (cards/buckets/debts/cash) and context (surface, amount, merchant/category). Rich, multi-step actions are limited to surfaces like `web`/`extension`.
- `simulateAction(state, ctx, action)` projects bucket/debt/cash results for each action; composite actions apply both purchase and follow-up debt paydown effects.
- `scoreDecision(...)` combines rewards, essential-bucket runway, debt relief, and penalties into a scalar score with human-readable reasons. Delay/reject carry small penalties unless constraints force them.
- Guardrails: `evaluateConstraintsForDecision` tags breaches (e.g., `HARD:ESSENTIAL_BUCKET_OVER_LIMIT`, `HARD:PAYDOWN_EXCEEDS_LIQUID`, `SOFT:ESSENTIAL_PURCHASE_DELAY`), and `enforceHardConstraints` drops unsafe decisions.
- API surfaces (`/api/scan`, `/api/sessions`, `/api/simulate`) prefer card-based actions for legacy payloads but still trace the full decision set for observability.

---

## Change Management Expectations
- Keep diffs small and scoped; prefer follow-ups over mega-PRs.
- When editing schema, document migration name, any backfill, and validation method.
- When touching engine/sessions/ledger, add or update tests and run integrity scripts (`scripts/audit-integrity.ts`) if applicable.
- Cross-link docs when you add new flows; update `docs/api.md` for any API shape changes.

---

## Final Checklist Before You Ship
- Lint/typecheck clean.
- No forbidden framings added.
- `/api/scan` stays advisory; wallet pass still gated by 501 unless certs are present.
- Database access through `lib/prisma`.
- Docs updated if API/schema behavior changed.

## Coding Style & Naming Conventions
- TypeScript + React; prefer async/await and typed responses in API routes. Use named exports when possible.
- Keep components server-rendered by default; mark client components at file top. Co-locate small client helpers next to their pages (`app/<route>/client.tsx` pattern).
- Follow ESLint guidance (2-space indent, trailing commas). Use Tailwind utility classes; avoid inline styles unless necessary.
- File names are lowercase with hyphens or canonical Next conventions (`page.tsx`, `route.ts`).
- All API routes must:
  - Use Zod schemas from `lib/validation/*` to parse `request.json()`; never treat parsed JSON as `any`.
  - Return typed responses and avoid `any`/`unknown` leaks at module boundaries.
  - Keep switch statements on enums exhaustive (use a `never` guard for default).
- Lint is strict: `@typescript-eslint/no-unsafe-*`, `@typescript-eslint/no-floating-promises`, and `@typescript-eslint/switch-exhaustiveness-check` are enforced. Don’t downgrade rules; fix the code instead.

## Testing Guidelines
- No formal suite yet—add focused unit tests around `lib/` utilities and API handlers as you touch them. Favor colocated `*.test.ts` or `__tests__` directories.
- Verify lint passes and exercise critical flows manually (`/buckets`, `/cards`, `/simulate`) before submitting.
- When adding migrations or data scripts, include a quick note on how you validated DB changes.
- When touching the engine, sessions, or ledger:
  - Add unit tests that assert invariants such as “no double-award for the same session”, “points remain PENDING until verified”, and “anomalous sessions/ledger rows are flagged consistently”.
  - Prefer narrow tests around `lib/engine.ts`, `lib/verification/verify-session.ts`, and `scripts/audit-integrity.ts` instead of broad end-to-end tests.

## Commit & Pull Request Guidelines
- Commit messages follow `type: summary` from history (e.g., `feat: add bucket budgeting UI`, `chore: update prisma schema`). Keep them imperative and scoped.
- PRs should include: what changed, why, how to test (`npm run lint`, migration commands, manual URLs), and any env var or schema impacts.
- Attach screenshots or short notes for UI/UX changes; link issues or tickets. Keep diffs small and focused; prefer follow-ups over mega-PRs.
- For schema changes (new enums/fields on sessions/ledger), document the migration name, any backfill strategy, and how you validated integrity (e.g., running `scripts/audit-integrity.ts` locally).

## Security & Configuration Tips
- Keep secrets in `.env.local` (`DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `NEXT_PUBLIC_SITE_URL`/`VERCEL_URL`). Never commit env files.
- Run `npm run seed:demo` only against disposable data. After pulling new migrations, rerun `prisma migrate dev` and regenerate the client before local development.
- Apple Wallet pass is scaffolded but disabled until certs are configured; `/api/wallet/cherry-pass` returns 501 by design.
- Admin tools (`/admin`) that clear user data, sessions, or ledger entries are for local/sandbox environments only. Do not expose these endpoints in production without additional auth/role checks.
- Integrity/audit scripts (`scripts/audit-integrity.ts`) are diagnostic; they should never mutate production data without explicit review.

## Default Agent Workflow
1. Read relevant docs (Vision, Legal Constraints, Vine, Wallet, API, System Map, Repo Structure, Auth).
2. Inspect code: `app/api/*`, `lib/*`, `prisma/*`, and relevant UI files.
3. Implement changes:
   - Keep API handlers thin; push domain logic into `lib/`.
   - Use `withUser` for auth on stateful routes.
   - Validate payloads via `lib/validation/*`.
4. Update docs when behavior changes (Status + Last updated required; separate Current vs Future behavior).
5. Run `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` before handoff.

## Doc Editing Rules
- Preserve legal guardrails; never weaken them.
- Every major doc must start with `Status` and `Last updated`.
- Split **Current behavior** vs **Future/Target behavior**; mark TODOs clearly.
- Cross-link to `docs/legal-constraints.md` for anything near payments, Vine, or Wallet.

## AGENT_TASK_TEMPLATE
For any non-trivial request, rewrite it internally into this structure:

1. Context
   - Repo path and domains involved (engine, auth, Vine, etc.).
2. Goal
   - One or two sentences of what must be achieved.
3. Constraints
   - Legal guardrails from `docs/legal-constraints.md`.
   - Branching rules (no branches, no commits).
   - Required commands (lint, typecheck, test, build).
4. Plan
   - Ordered steps: files to inspect, changes to make, docs to touch.
5. Execution Checklist
   - Concrete actions with file paths.
6. Validation
   - Which commands to run and success criteria.
7. Reporting
   - Summary format: what changed, where, why, and remaining TODOs.
