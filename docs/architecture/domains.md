Status: Active
Last updated: 2026-10-17

# Domains

Source of truth: `scripts/guardrails/domains.manifest.json` (enforced by `check:domain-boundaries`; every file under `lib/`, `app/`, `components/`, `types/` is owned by exactly one domain). This page is a readable rendering of that file. If they disagree, fix this page.

Query it: `npm run report:domain-impact -- <path...>` prints the domain, allowed imports, dependents, tests, docs and invariants for any file.

## Layers
- **core** — pure, deterministic, no DB, no HTTP, no wall clock. Engine, authority, accounting, contracts, schemas, config, shared helpers.
- **runtime** — the only place Prisma and the system clock are wired into a `World`.
- **service** — business capabilities. Each owns its API routes and its `lib/` modules. Services may depend on core and runtime, and on the specific sibling services listed in `mayImport`.
- **surface** — UI shells, components, dev console. May import anything.

## Domain table

| Domain | Layer | Purpose | Owns | Tests | Docs |
| --- | --- | --- | --- | --- | --- |
| `shared` | core | Pure helpers with no domain knowledge (errors, enums, text, numbers, money, ids, invariants, routes). | `lib/errors.ts`, `lib/enums.ts`, `lib/text.ts`, `lib/numbers.ts`, `lib/money.ts`, `lib/ids.ts`, `lib/invariants.ts`, `lib/routes.ts`, `lib/formatCurrency.ts`, `lib/server-determinism-fixture.ts`, `lib/util/**`, `lib/api/**`, `types/**`, `lib/mcc.ts` | `tests/node/idempotency*.test.ts`, `tests/node/identity-determinism.test.ts` | — |
| `schemas` | core | Zod request/response contracts and the parseJsonBody boundary helper. | `lib/schemas/**`, `lib/validation.ts` | `tests/node/simulate-response-schema.test.js`, `tests/node/recommendation-temporal-schema.test.ts` | `docs/zod-style.md`, `docs/api.md` |
| `adapters-contracts` | core | Pure TypeScript port interfaces (Clock, Logger, Digest, Entropy, stores, World). No implementations. | `lib/adapters/*.ts`, `lib/adapters/contracts/**` | `tests/node/adapters-contracts.test.ts` | `docs/adapters.md` |
| `engine` | core | Deterministic decision engine: EngineInput contract, solver, objective, candidates, horizon, uncertainty. No time, no DB. | `lib/engine/**`, `lib/engine.ts`, `lib/engine-invariants.ts` | `tests/node/engine*.test.*`, `tests/node/engine/**`, `tests/node/objective-utility.test.ts` | `docs/architecture/engine-rules.md`, `docs/doctrine.md`, `docs/engine-roadmap.md`, `docs/engine-freeze.md`, `docs/engine-time-semantics.md`, `docs/engine-optimality/status.md`, `docs/simulation/objective-semantics.md` |
| `accounting` | core | Double-entry ledger model and engine accounting proof. | `lib/accounting/**` | `tests/node/accounting/**`, `tests/node/engine-accounting-*.test.ts` | `docs/accounting-axioms.md`, `docs/accounting/invariants.md`, `docs/engine-ledger-boundary.md` |
| `authority` | core | Pure spend admissibility decisions and verdict policy. | `lib/authority/**`, `lib/policy/**`, `lib/guards/**` | `tests/node/authority/**`, `tests/node/authority-invariants.test.ts`, `tests/node/policy-totality.test.ts`, `tests/node/decision-event-recording.test.ts` | `docs/authority-v1.md`, `docs/decision-event-ledger.md` |
| `config` | core | Typed, frozen server/public config loaded once at the boundary. | `lib/config/**`, `lib/base-url.ts` | `tests/node/config-injection.test.ts`, `tests/node/no-env-smoke.test.ts` | `docs/env-policy.md` |
| `persistence` | runtime | The single Prisma client instance. | `lib/prisma.ts` | `tests/db/**` | `docs/schema-evolution.md`, `docs/storage-doctrine.md` |
| `adapters-runtime` | runtime | Concrete World wiring (Prisma stores, system clock, entropy, logger) and Prisma-backed engine/authority bridges. | `lib/adapters/runtime/**`, `app/api/_clock.ts`, `lib/engine-state.ts`, `lib/legacy-engine.ts`, `lib/legacy-engine-types.ts`, `lib/replay/**` | `tests/node/engine-state.prisma.test.js`, `tests/node/engine-world.test.ts`, `tests/node/guardrails/prisma-adapter-totality.test.ts` | `docs/adapters.md`, `docs/engine-state.md` |
| `identity` | service | NextAuth wiring, user context resolution, withUser guard. | `lib/auth.ts`, `lib/with-user.ts`, `lib/user-context.ts`, `lib/identity/**`, `lib/dev/**`, `app/api/auth/**`, `app/api/user/context/**`, `app/signin/**` | `tests/next/user-context*.test.*`, `tests/next/*.user-context.test.*` | `docs/architecture/auth.md` |
| `buckets` | service | Budget buckets: balance math, period rollover, regimes, freshness. | `lib/buckets-runtime.ts`, `lib/buckets/**`, `lib/category-preferences.ts`, `app/api/buckets/**` | `tests/node/bucket*.test.js`, `tests/node/buckets-periods.test.js`, `tests/node/category-preference-enum.test.js` | `docs/buckets-rollover-plan.md` |
| `cards` | service | Cards and reward rules CRUD. | `app/api/cards/**` | `tests/next/api-rewards.validation.test.js` | `docs/api.md` |
| `income` | service | Income and P2P classification over bank transactions; income regimes. | `lib/income/**` | `tests/node/income-*.test.js` | `docs/income-regimes.md` |
| `bank` | service | Bank transaction ingest (idempotent on (userId, externalId)) and dev CSV provider. | `lib/bank/**`, `lib/ingest/**`, `app/api/dev/bank/**` | `tests/node/bank-ingest*.test.js` | `docs/bank-ingest-notes.md` |
| `evaluation` | service | Advisory scan/simulate surfaces: MCC resolution, engine invocation, decision-event telemetry. Stateless with respect to sessions and ledger. | `app/api/scan/**`, `app/api/simulate/**`, `app/api/simulations/**`, `app/api/mccs/**`, `app/api/user/merchants/**`, `lib/scan-helpers.ts`, `lib/scan-types.ts`, `lib/scan-client-state.ts`, `lib/simulation-adapter.ts`, `lib/mccCategoryMapper.ts` | `tests/next/api-scan*.test.*`, `tests/next/api-simulate*.test.*`, `tests/node/scan-client-state.test.js`, `tests/node/simulation-adapter.test.js`, `tests/node/simulate-response-schema.test.js` | `docs/api.md` |
| `sessions` | service | Recommendation sessions, confirm/verify lifecycle, Cherry Points ledger, verification stubs. | `lib/sessions/**`, `lib/verification/**`, `lib/points.ts`, `lib/idempotency.ts`, `app/api/sessions/**`, `app/api/dev/pending-sessions/**`, `app/api/dev/verification/**` | `tests/next/api-sessions*.test.*`, `tests/node/sessions-bucket-reversal.test.js`, `tests/node/verification-session.test.js`, `tests/node/idempotency.test.ts` | `docs/verification-flow.md`, `docs/decision-event-ledger.md` |
| `vine` | service | Cherry Vine context beacon ingest (merchant + amount + timestamp). Never a payment device. | `lib/vine/**`, `app/api/vine/**` | `tests/node/vine-*.test.js`, `tests/next/api-vine-order*.test.js`, `tests/next/vine-order-security.test.js`, `tests/node/run-recommendation.user-context.test.js` | `docs/cherry-vine.md`, `docs/vine-security.md` |
| `wallet` | service | Cherry Pass storeCard scaffold; returns 501 unless fully configured and enabled. | `lib/wallet/**`, `app/api/wallet/**` | `tests/node/wallet-pass-*.test.*` | `docs/wallet-pass.md` |
| `autopilot` | service | Autopilot preview/commit flow and simulation orchestration on top of the engine. | `lib/autopilot/**`, `app/api/autopilot/**`, `lib/metrics/**`, `lib/validation/autopilot/**` | `tests/node/autopilot-*.test.*`, `tests/next/api-autopilot*.test.*`, `tests/next/autopilot-*.test.*`, `tests/node/onboarding-prereqs.test.ts` | `docs/autopilot-master-spec.md`, `docs/autopilot-engine-adapter.md` |
| `daily-state` | service | Daily state computation and alerting. | `lib/daily-state/**`, `lib/alerts/**`, `app/api/daily-state/**`, `app/api/internal/**` | `tests/node/alertPolicy.test.js`, `tests/node/type/daily-state.types.test.ts` | `docs/daily-state.md` |
| `evaluator` | service | Offline engine evaluator. Read-only over Sessions/Ledger/Buckets; writes only HistoricalEngineEvaluation. | `lib/evaluator/**` | `tests/node/offline-evaluator-*.test.js` | `docs/offline-evaluator.md` |
| `observability` | service | Logging, metrics, activity feeds, health and admin stats. | `lib/logger.ts`, `lib/log.ts`, `lib/logging.ts`, `lib/activity/**`, `lib/unified-activity.ts`, `lib/admin/**`, `app/api/activity/**`, `app/api/health/**`, `app/api/admin/**` | — | `docs/decision-event-ledger.md` |
| `dev-tools` | surface | Dev-only console pages, seeding, and inspection routes. Never shipped to users. | `app/\(dev\)/**`, `app/api/seed-demo/**`, `app/api/dev/engine/**`, `lib/demo-seeder.ts` | — | `docs/dev-route-inventory.md`, `docs/dev-ui-parity.md` |
| `ui` | surface | User-facing app shell, shared components, client API helpers. | `app/\(user\)/**`, `app/page.tsx`, `app/layout.tsx`, `app/providers.tsx`, `components/**`, `lib/ui/**`, `lib/client/**`, `lib/home/**`, `lib/dashboard.ts`, `proxy.ts` | `tests/next/home-screen-authority.test.tsx`, `tests/node/home-ui-contract.test.ts`, `tests/next/client-api.test.js` | `docs/information-architecture.md`, `docs/routes-map.md`, `docs/shell-architecture.md`, `docs/home-ui-contract.md` |

## Canonical entrypoints (where to start reading)
- Engine decision: `safeSolveDecisionForWorld` in `lib/engine/run.ts` (routes) and `solveDecision` in `lib/engine/solver.ts` (pure). Input contract: `lib/engine/input/EngineInput.ts`; adapter from Prisma-shaped state: `lib/engine/input/fromLegacy.ts`.
- World wiring: `buildPrismaWorld()` in `lib/adapters/runtime/world.prisma.ts`.
- Auth boundary: `resolveUserContext` in `lib/user-context.ts` (most routes) and `withUser` in `lib/with-user.ts` (9 routes).
- Request validation: `parseJsonBody` in `lib/validation.ts` with a schema from `lib/schemas/*`.
- Session lifecycle: `app/api/sessions/route.ts` (create), `lib/sessions/confirm-service.ts` (confirm), `lib/verification/verify-session.ts` (verify).
- Bucket math: `computeBucketBalance` in `lib/buckets-runtime.ts`; freshness: `lib/buckets/ensure-fresh.ts`.
- Autopilot: `getAutopilotPreview`, `commitAutopilotDecision(V2)` in `lib/autopilot/service.ts`.
- Vine: `runRecommendationFromOrderContext` in `lib/vine/run-recommendation.ts`.
- Bank ingest: `upsertBankTransactions` in `lib/bank/ingest.ts`.

## Domain invariants (enforced or documented; see `dependency-rules.md` for which)
- `engine`: No Date/Date.now (check:engine-date)
- `engine`: No Prisma (check:engine-prisma)
- `engine`: EngineInput is the only input contract (check:engine-input-boundary)
- `engine`: Behavior/input/candidate/accounting version bumps + chore(engine-freeze) commit (check:engine-version-gates, check:engine-version-bump, check:engine-freeze)
- `accounting`: check:accounting-invariants
- `accounting`: check:no-mutation
- `accounting`: check:replay-equals-materialized
- `authority`: check:authority-lint
- `authority`: check:authority-invariants
- `authority`: check:engine-date
- `authority`: check:engine-prisma
- `config`: check:config
- `config`: check:config-init
- `config`: check:config-lock
- `buckets`: Balance math only via lib/buckets-runtime.ts; budgetAmount/spentCents authoritative, currentAmount legacy mirror
- `bank`: All ingest writes go through upsertBankTransactions; BankTransaction.id never set from ingest data
- `sessions`: Confirm increments Bucket.spentCents once per session; ledger rows PENDING -> POSTED/REVOKED only via verify
- `evaluator`: Gate on CHERRY_OFFLINE_EVALUATOR_ENABLED; call assertOfflineEvaluatorModelsReady() first; derive runId via defaultRunIdForUser

## Known cross-domain debt (allowlisted in the manifest; remove the entry when fixed)
- `lib/engine/legacy.ts` -> `lib/legacy-engine.ts`: Legacy engine facade re-exports the Prisma-backed runtime bridge; importing lib/engine.ts loads Prisma. Engine-freeze change; track as debt.
- `lib/engine/public.ts` -> `lib/engine-state.ts`: Autopilot swipe entrypoint reaches Prisma engine-state loader through the engine barrel. Engine-freeze change; track as debt.
- `lib/engine/public.ts` -> `lib/scan-helpers.ts`: Value cycle engine -> scan-helpers -> engine. Engine-freeze change; track as debt.
- `lib/authority/replayAuthority.ts` -> `lib/adapters/runtime/authority.replay.prisma.ts`: Pure module re-exports a runtime implementation. No importers; candidate for deletion.
- `lib/adapters/runtime/authority.prisma.ts`, `engine-state.prisma.ts` -> `lib/buckets/periods.ts`, `lib/buckets-runtime.ts`; `legacy-engine.prisma.ts` -> `lib/buckets/periods.ts`: Runtime loader applies pure bucket math (type-only Prisma imports). Exact edge only; runtime may not import other service code. Move bucket math to a core domain to retire.

## Change impact
When you change a domain, run its `tests` globs (DOMAIN level), then the FULL gate. Domains listed under "imported by" in `report:domain-impact` output are the ones whose tests can break. Engine, authority and accounting changes additionally require `npm run check:guardrails` (version gates, freeze, accounting proofs) and the `chore(engine-freeze)` protocol in `docs/doctrine.md`.

## Related docs
- `index.md`, `dependency-rules.md`, `testing.md`
