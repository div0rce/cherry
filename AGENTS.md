Status: Active
Last updated: 2026-01-02

# Cherry Agents — Canonical Operating Guide

This file is the operating contract for humans and agents working in this repo. It is authoritative after CI/workflows and guardrail registries. If something conflicts, fix the lower authority, not the higher.

## Authority Ladder (highest to lowest)
1. `package.json` scripts + `.github/workflows/*` (actual behavior)
2. Guardrail registries and tests (`scripts/guardrails/*`, `tests/guardrails/*`)
3. `AGENTS.md` (this file)
4. `docs/*` (specs and explanations)
5. Everything else (notes, drafts, marketing)

## Product Identity and Legal Guardrails (non-negotiable)
- Cherry is a real-time spending copilot, not a card, proxy, processor, or payment terminal.
- Cherry never fronts transactions, holds funds, or touches payment rails.
- Cherry Vine is a context beacon (merchant + amount + timestamp), not a reader or terminal.
- Cherry Pass is a storeCard-style advisory pass; it is not a payment instrument.
- Recommendation sessions and Cherry Points are advisory and sandboxed.

Forbidden framings: “fronting card,” “proxy BIN,” “tap to pay with Cherry,” “Cherry terminal,” “payment card.”

## Current behavior (enforced / in code)
- Core loop: Observe → Evaluate → Recommend → Reward.
- `/api/scan` runs the engine and logs a `DecisionEvent` for telemetry; it does not create sessions or ledger rows.
- Sessions + ledger persistence happen via `/api/sessions` and confirm/verify flows.
- Vine ingest (`/api/vine/order`) is dev-only and context-only; no payment rails.
- Wallet pass (`/api/wallet/cherry-pass`) returns 501 unless fully configured and explicitly enabled.
- Engine is deterministic and pure: it consumes `EngineState` + `EngineContext` and emits ranked decisions.

## Determinism and Time Injection
- Do not call `Date.now()` or `new Date()` in `lib/engine/*` or `lib/authority/*`.
- Time enters at boundaries (API routes, adapters) and is passed in as `nowMs`.
- Guardrails enforce deterministic core behavior.

## SSR / Rendering Determinism
- Server components must not call `Date.now()`, `Math.random()`, or locale-dependent formatting.
- Pages must render from a single data snapshot; no structural changes on hydration.
- Empty/data states must share a stable outer container.

## Data and DB Boundaries
- Prisma client must only be instantiated in `lib/prisma.ts` and consumed by runtime adapters.
- Engine and authority logic must not import Prisma or `@prisma/client`.
- Zod schemas live in `lib/schemas/*`; parse via `parseJsonBody` from `lib/validation.ts`.
- Stateful API routes must use `withUser` and return `401` for unauthenticated requests.
- Bank ingest invariants:
  - `BankTransaction.id` is internal and never set from ingest data.
  - Idempotency key is `(userId, externalId)` only.
  - All ingest writes go through `upsertBankTransactions`.

## Bucket Runtime Invariants
- Bucket math must flow through `lib/buckets-runtime.ts`.
- Authoritative fields: `budgetAmount`, `spentCents`.
- Derived only: `committedCents`, `remainingCents`.
- `currentAmount` is legacy-mirror only; never authoritative.

## Offline Evaluator (hard boundary)
- Evaluator code is read-only with respect to Sessions, Ledger, Buckets.
- Outputs are diagnostic only and must never affect user-facing decisions.
- Must call `assertOfflineEvaluatorModelsReady()` before DB access.
- Gate execution behind `CHERRY_OFFLINE_EVALUATOR_ENABLED`.
- Never hard-code runIds; derive via `defaultRunIdForUser(userId, now)`.

## Guardrails Policy
- Guardrails are registered in `scripts/guardrails/registry.mts` and must run via `npm run check`.
- Guardrails are unaddressable by path; run them only via `npm run check`.
- Guardrails must be deterministic and side-effect free; no network or DB I/O.
- Do not weaken guardrail severity or bypass guardrail tests.

## Script Runner Contract
- Repo is ESM by extension. `.mts` is allowed only under `scripts/`.
- `.mts` scripts must be run via `npm run ts:esm -- <script>`.
- `.ts` files under `scripts/` must not use ESM syntax.
- Script imports must use runtime extensions (`.js`/`.mjs`/`.cjs`); no `@/` aliases.

## CI Truth and DB Posture
- `.github/workflows/ci.yml` runs `npm ci` then `npm run ci:verify`.
- Tests run with Prisma mocked; CI green does not fully prove DB behavior.
- `.github/workflows/env-checks.yml` provisions Postgres and runs `check:db:required` with migrations.

## Change Protocol
- Keep API handlers thin; move domain logic into `lib/`.
- Use `safeSolveDecisionForWorld` / `safeSolveDecisionForUser` for engine decisions.
- For schema changes:
  - `npx prisma format`
  - `npx prisma migrate dev --name <desc>`
  - `npx prisma generate`
  - Run `npm run check`, `npm test`, and `npm run build`.
- For docs: add `Status` + `Last updated`, split Current vs Future, add Related docs.

## PR Checklist (what each command proves)
- `npm run check` → guardrails + lint + typecheck are green.
- `npm test` → unit/guardrail tests green (Prisma mocked by loader).
- `npm run build` → Next.js build passes.
- `npm run ci:verify` → mirrors CI entrypoint.
- If schema changed: migrations apply and Prisma client is regenerated.

## Drift Policy
- If docs conflict with code, update docs to match reality unless legal constraints require a code fix.
- If code conflicts with legal constraints, fix code and add guardrail/tests rather than weakening docs.
- Do not update guardrail fixtures unless you also update the corresponding tests intentionally.

## Product-Ready Definition (Cherry terms)
Cherry is product-ready for a pilot when:
- Engine decisions are deterministic and stable across core surfaces.
- Sessions + ledger lifecycle is reliable (no double-award, clear pending/posted rules).
- Vine and Wallet remain advisory-only and correctly gated.
- Observability (DecisionEvent logging, guardrails) is in place and CI is green.

## Future/Target Behavior (explicitly speculative)
- Full bank ingest verification and automated ledger posting beyond current stubs.
- Enforced Vine signature lifecycle and expanded device coverage.
- Marketing and user-facing surfaces under `app/(marketing)` and richer user shell routes.

## Related docs
- `docs/legal-constraints.md`
- `docs/cherry-vision.md`
- `docs/ci-and-guardrails.md`
- `docs/guardrails.md`
- `docs/script-standards.md`
- `docs/repo-structure.md`
