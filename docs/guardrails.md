Status: Active
Last updated: 2026-01-31

# Guardrails

## Current behavior
- Guardrail and execution script registration is mandatory; registries are the only authority.
- CI runs `npm run ci:verify` as the sole truth gate; `check` remains pure (guardrails + lint + typecheck), and env checks live in `check:env`.
- Script conventions (no raw JSON.parse, no any, .mts only under scripts) live in `docs/script-standards.md`.
- Guardrail checks now enforce JSON.parse bans in scripts and npm arg forwarding (`check:script-json-parse`, `check:npm-arg-forwarding`).
- Script runtime boundaries are enforced; scripts may not import app/components/lib-client runtime modules (`check:script-runtime-boundary`).
- Doctrine presence/versioning is enforced (`check:doctrine-present`).
- Commit scope isolation is enforced via staged-file checks (`check:change-isolation`).
- Guardrails are tiered: core checks run via `check:guardrails`, env checks run via `check:env`.
- Engine version gates and fixture pins are enforced (`check:engine-version-gates`, `check:engine-version-bump`).
- Engine version imports are restricted (`check:engine-version-imports`).
- AGENTS doctrine deferral is enforced (`check:agents-doctrine-link`).
- Completion evidence is enforced in agent/CI mode (`check:evidence-present`, `check:evidence-verifies`).
- Env contracts, local env bans, and temp root safety are enforced (`check:env-contract`, `check:no-local-env-files`, `check:tmp-root-safety`).
- Package manager pinning and CI install policy are enforced (`check:package-manager-pin`, `check:ci-uses-npm-ci`, `check:lockfile-integrity`).
- Vercel parity is enforced (`check:vercel-parity`).
- Native bindings are verified (`check:native-bindings`).
- Schema evolution protocol and destructive migration plans are enforced (`check:schema-evolution`, `check:schema-breaking-plan`).
- Lockfile consistency is enforced via `npm ci --ignore-scripts` in an isolated temp dir (`check:lockfile-sync`).
- Function size budgets are enforced from Vercel output (`check:function-size-budget`).
- Vendor shim patches are forbidden unless explicitly allowlisted (`check:no-vendor-shims`).
- DB truth scripts (`scripts/db-check-*`) must import PrismaClient directly and never use app-level Prisma helpers.
- Accounting invariants run as deterministic guardrails over `lib/accounting` and its property tests.
- Engine optimality guardrail runs bounded oracle tests via `check:engine-optimality`.
- Engine optimality versions are frozen by `check:engine-optimality-version`.
- Guardrail runner supports `--aggregate` shadow execution; it accepts guardrail names only (no per-guardrail args) and reports in registry order by default (`--sort=name` for alphabetical).
- Workflow presence, quoted expressions, runner-context, and delete-safety are enforced (`check:workflow-files-present`, `check:workflow-expressions-quoted`, `check:workflow-runner-context`, `check:no-workflow-force-delete`).

## Guardrail Numbering (Legacy)
- Guardrail numbers are legacy identifiers; they do not imply ordering, completeness, or priority.
- Use domain headings and guardrail names for references and reviews.

## Regression Policy
- No guardrail may be weakened or removed without:
  - an explicit doc change in this file
  - a justification section
  - a PR reference
- Guardrail checks may only move from advisory → enforced or partial → enforced.
- Downgrades are exceptional events and must be documented.

## Domain: Registry Integrity (Authoritative)

### Invariant A — Name ↔ Path Bijection

- Every guardrail has exactly one:
  - npm script: `check:<name>`
  - registry key: `check:<name>`
  - file path: `scripts/check-<name>.mts`
- Any deviation is a hard CI failure.
- Why: Inline strings allow silent drift. Drift creates false confidence in CI coverage. Guardrails must be mechanically provable, not inferred.
- Enforcement: `check:guardrail-name-path-bijection`, `check:guardrail-registry`, `check:no-orphan-check-files`.

### Invariant B — Registry Is the Source of Truth

- Guardrail paths must not be constructed ad hoc.
- All guardrail execution resolves via `scripts/guardrails/registry.mts`.
- Constants may be introduced only to strengthen invariants (e.g. `CATCH_UNKNOWN_PATH`).
- Enforcement: `check:guardrail-execution`, `check:execution-registry-completeness`.

### Invariant C — Guardrails Are Unaddressable by Path

- Guardrail scripts cannot be executed directly via `node`, `tsx`, `ts-node`, workflows, docs, or nested npm scripts.
- Guardrails are named capabilities, not files.
- Enforcement: `check:guardrail-execution`, CI fixtures covering bypass attempts.

### Guardrail 46c — Workflow Files Present

- Required CI workflows must be tracked in git.
- Enforcement: `check:workflow-files-present`.

### Guardrail 46d — Workflow Expressions Quoted

- `RUNNER_TEMP` usage for `CHERRY_TMP_ROOT` must be quoted to avoid YAML tooling errors.
- Enforcement: `check:workflow-expressions-quoted`.

### Guardrail 46e — Workflow Force Delete Requires Tag

- Deleting workflow files requires `[workflow-change]` in the commit message.
- Enforcement: `check:no-workflow-force-delete`.

### Guardrail 46f — Workflow Runner Context

- `runner.*` expressions are forbidden outside `steps` blocks.
- Enforcement: `check:workflow-runner-context`.

## Domain: Config & Boundary Safety

### Guardrail 6 — Config Immutability

- Server config is constructed once at the boundary (app/api or scripts) and then deep-frozen; `lockServerConfig()` prevents any subsequent mutation or re-registration.
- `setServerConfig()` throws after lock even with `allowOverwrite`; loaders cannot be registered once locked.
- Public and runtime configs are also deep-frozen on set to block incidental mutation during a request/job.
- Boundaries should call `initConfigFromEnv()` (app/api routes, scripts, test bootstrap) before doing work; this sets the config and locks it by default outside tests.
- Tests may inject configs with `allowOverwrite: true, lock: false` before calling `lockServerConfig()` to mimic boundary assembly; no fallback-to-env is permitted after lock.
- Guardrail check: `check:config-lock` asserts locking, immutability, and loader rejection.

### Guardrail 44 — Config Snapshot Integrity

- `tsconfig.base.json` is the sole semantic authority; all other tsconfigs are view-only, CI aggregators, or fixtures.
- Fixture tsconfigs may diverge semantically and are excluded from enforcement.
- NodeNext usage is quarantined to script configs only.
- `docs/config-snapshot.md` must list every config file and match on-disk contents.
- `.js` import specifiers are disallowed in app/components/lib/tests; they are permitted only in scripts.
- `next.config.ts` must exclude `.next/export-detail.json`, `.next/lock`, and `.next/server/proxy.js` from output tracing to avoid non-export build failures.
- Enforcement: `check:config-snapshot`.

### Authority `inputsVersion` Stability

`inputsVersion` is deterministic for a fixed `(engineVersion, inputs, snapshot)`. It is not
guaranteed to remain stable across different `engineVersion` values. Consumers must not compare
`inputsVersion` values across engine versions.

## Domain: Environment Contracts

### Guardrail 46 — Environment Import Integrity

- Every source file is owned by exactly one environment (`env:node`, `env:next`, `env:guardrail`).
- `env:node` may not import `env:next`, `next/*`, `react`, or `react-dom`.
- `tests/node/**` may only import `env:node`; `tests/next/**` may only import `env:next` or `env:node`.
- Enforcement: `check:environment-import-integrity`.

### Guardrail 46b — No Local Env Files

- Local env files (`.env.local`, `.env.development`, `.env.production`) must not be tracked.
- Enforcement: `check:no-local-env-files`.

### Data Directory Policy (Documented)

- `data/**` must contain deterministic literals only (no runtime side effects).
- `data/**` must not import from `app/**` or `lib/**`.

## Domain: Script Runtime Boundary

### Guardrail 47 — Script Runtime Boundary

- Scripts must not import Next runtime modules (`app/`, `components/`, or `lib/client/**`).
- Proof harnesses should use `lib/engine/**` APIs instead of runtime modules.
- Enforcement: `check:script-runtime-boundary`.

## Domain: Dependency Integrity

### Guardrail 48 — Lockfile Sync

- `package.json` and `package-lock.json` must be in sync; `npm ci --ignore-scripts` must succeed in a clean temp dir.
- This guardrail catches dependency drift that would fail CI even if local installs appear to work.
- Enforcement: `check:lockfile-sync`.

### Guardrail 50 — No Vendor Shims

- `types/vendor/**` shims are forbidden unless explicitly allowlisted.
- Allowlist entries must include reason, upstream version, audit date, and removal criteria.
- Any `tsconfig` path mapping into `types/vendor/` requires a separate allowlist entry.
- `patches/**.patch` files are allowed only if explicitly allowlisted with the same metadata.
- `types/compat/auth-core-*` shims are forbidden; upstream type fixes must use patch-package.
- Enforcement: `check:no-vendor-shims`.

## Domain: Deployment Budgets

### Guardrail 49 — Function Size Budget

- Serverless function bundles must stay under a fixed uncompressed size budget.
- Guardrail reads `.vercel/output/functions/**/.vc-config.json` and sums each function directory size.
- If `.vercel/output` is missing, the guardrail reports a skip; run after `vercel build` to enforce.
- Enforcement: `check:function-size-budget`.

## Domain: DB Truth Lane

### Guardrail 32 — DB Truth Boundary

- DB truth scripts (`scripts/db-check-*`) must not import `lib/prisma` or any app-level Prisma helper.
- DB truth scripts must instantiate `PrismaClient` directly from `@prisma/client`.
- Enforcement: `check:db-truth-boundary`.

### Guardrail 33 — DB Runner Exclusivity

- DB truth scripts must execute via `scripts/execution/run-db.mts`.
- `check:db:*`, `check:db-ready`, and `check:run-db-tests` must not use the standard execution runner.
- Enforcement: `check:db-runner-exclusivity`.

### Guardrail 34 — DB Constraint Coverage

- Any migration that adds a `UNIQUE`, `FOREIGN KEY`, `NOT NULL`, or `CHECK` constraint must include a
  `tests/db/constraints/*` test that references the constraint.
- Guardrail parses migrations for new constraints and fails if none of the `tests/db/constraints` tests
  reference the constraint identifier.
- Enforcement: `check:db-constraint-coverage`.

### Guardrail 35 — DB Truth Surface

- DB truth scripts and DB tests are limited to assertions about existence, impossibility, and conservation.
- DB truth must not assert preferred outcomes, performance, query shape, or business logic behaviors.
- Enforcement: policy guardrail; changes require explicit review.

### Guardrail 36 — DB Constraint Naming

- Migrations must use explicit names for `UNIQUE`, `FOREIGN KEY`, and `CHECK` constraints.
- Naming format: `{table}__{columns}__{type}` where type is `unique`, `fk`, or `check`.
- Constraint names must be unique across the schema.
- Forward-only enforcement for migrations with a timestamp prefix >= `20260113000000`.
- Enforcement: `check:db-constraint-naming`.

### Guardrail 37 — DB Semantic Suite Minimum

- The DB semantic suite must include baseline tests for idempotency, atomicity, ledger conservation,
  cross-row conservation, causality, semantic uniqueness, and temporal immutability.
- Required files:
  - `tests/db/semantics/idempotency-no-double-apply.test.ts`
  - `tests/db/semantics/atomicity-no-partial-writes.test.ts`
  - `tests/db/semantics/ledger-conservation.test.ts`
  - `tests/db/semantics/ledger-cross-row-conservation.test.ts`
  - `tests/db/semantics/status-causality.test.ts`
  - `tests/db/semantics/ledger-semantic-uniqueness.test.ts`
  - `tests/db/semantics/temporal-immutability.test.ts`
- Enforcement: `check:db-semantic-suite-minimum`.

### Guardrail 38 — DB Semantic ORM Agnosticism

- DB semantic tests must assert violations using SQLSTATE codes or constraint identifiers.
- ORM-specific error types or error codes are forbidden in `tests/db/semantics`.
- Do not branch on Prisma error classes, `error.code`, or vendor-specific error strings.
- Enforcement: `check:db-semantic-orm-agnostic`.

### Guardrail 39 — Ledger Write Entry Points

- Direct `CherryPointLedger` writes are allowed only in approved entrypoints.
- Approved entrypoints: persistence adapter, session confirm/verify flows, demo seeding, and admin clear routes.
- Enforcement: `check:db-ledger-entrypoints`.

## Domain: Schema Evolution

### Guardrail 54 — Schema Evolution Protocol

- Schema changes require manifest updates and doc updates plus migration hygiene enforcement.
- Guardrail check: `check:schema-evolution`.

### Guardrail 55 — Destructive Migration Plan

- Destructive migrations (`DROP TABLE` / `DROP COLUMN`) require a plan in `docs/schema-breaking/<migration-id>.md`.
- Guardrail check: `check:schema-breaking-plan`.

## Domain: Accounting Integrity

### Guardrail 40 — Accounting Invariants

- Property-based accounting invariants must remain green under fixed and rotating seed sets.
- Enforcement: `check:accounting-invariants`.

### Guardrail 41 — Replay Equals Materialized

- Event replay must match the incrementally materialized ledger state.
- Enforcement: `check:replay-equals-materialized`.

### Guardrail 42 — Append-Only Ledger

- Accounting transactions are immutable; corrections are append-only.
- Enforcement: `check:no-mutation`.

### Guardrail 43 — DB Accounting Replay

- DB materialized balances must match in-memory replayed ledger balances.
- Enforcement: `check:db-accounting-replay`.

### Guardrail 44 — Accounting Proof Coverage

- Every accounting axiom must be covered by at least one artifact and marked FULL.
- Enforcement: `check:accounting-proof-coverage`.

### Guardrail 45 — Guardrail Execution Parity

- `check` and `check:aggregate` must execute the same guardrails in registry order; only failure handling may differ.
- Enforcement: `check:guardrail-execution-parity`.
- Prevents skipped, reordered, or ad hoc guardrail execution lists.

### Guardrail 45b — Guardrail Runner Shape

- Guardrail execution must iterate `GUARDRAIL_NAMES` exactly once; filtering is membership only.
- Execution must not iterate selection arrays directly.
- Enforcement: `check:guardrail-runner-shape`.

## Domain: Loader & Guardrail Event Integrity

### Guardrail 7 — ESM Loader Totality

- ESM loader hooks must be total: every branch returns a valid `{ format, source }` or delegates to `defaultLoad`.
- Loader hooks must never return `undefined` sources; prefer deterministic sentinel modules for tests.
- Sentinel paths are allowed only under `CHERRY_TEST_LOADER_SENTINEL=1` and must return valid modules.
- Guardrail checks: `check:loader-contract` and `tests/node/guardrails/esm-loader-contract.test.ts`.

### Guardrail 8 — Guardrail Event Totality

- Guardrail events must include `timestamp` and `timestampSource` (`boundary` | `client` | `engine`).
- API routes must emit `timestampSource: boundary`; client components must emit `timestampSource: client`.
- Guardrail checks: `check:guardrail-time` and `tests/node/guardrails/guardrail-event-totality.test.ts`.

### Guardrail 9 — Prisma Adapter Readiness

- Prisma-backed adapters must assert model availability before reads/writes.
- Missing models throw `AppError('INTERNAL', 'Missing Prisma model: <name>', 500)` deterministically.
- Guardrail tests: `tests/node/guardrails/prisma-adapter-totality.test.ts`.

### Guardrail 10 — Side-Effect Expiration

- `legacy-combo` allowlist entries require `expiresBy: YYYY-MM-DD`.
- CI fails when expired, removed, or increased.
- Guardrail checks: `check:side-effects:diff`.

## Domain: Engine & Authority Safety

### Guardrail 11 — Engine Boundary No-Throw

- Engine-facing APIs (`safeSolveDecisionForWorld`, `simulateSpendAuthority`) must never throw.
- Invalid inputs return structured outcomes, not exceptions.
- Guardrail tests: `tests/node/guardrails/engine-no-throw.test.ts`.

### Guardrail 12 — Boolean Totality

- No implicit truthiness checks on non-boolean values.
- Conditionals must compare explicitly (`===`, `!==`, `<`, `>`) or use typed helpers.
- Guardrail checks: `check:implicit-boolean` and `tests/node/guardrails/no-implicit-boolean.test.ts`.

### Guardrail 13 — Branded Policy Types

Certain strings carry semantic meaning and must be branded.

Examples:
- IsoDateString
- MoneyCents
- EngineVersion

Rules:
- Branded types may ONLY be created via constructors.
- No direct literals.
- No casting.
- Violations fail CI.

Rationale:
Silent misuse of policy metadata causes long-term system rot.

Guardrail checks: `check:branded-literal` and `tests/node/guardrails/branded-type-enforcement.test.ts`.

### Guardrail 15 — EngineInput Boundary Hygiene

- EngineInput is defined only in `lib/engine/input/EngineInput.ts`.
- EngineInput imports must use the canonical module path.
- Boundary files (`lib/engine/input/**`, `check:engine-freeze`) may not use array element access (`arr[i]`).
- Enforcement: `check:engine-input-boundary`.

### Guardrail 58 — Replay Staging Hygiene

- Replay staging artifacts must never be committed under `tests/replay/_staging/**`.
- Enforcement: `check:replay-staging-empty`.

### Guardrail 62 — Replay Object Store Integrity

- Replay payloads must live only under `tests/replay/objects/**`.
- Replay indexes must live under `tests/replay/index/**` and reference objects by hash only.
- No inline replay payload JSON is permitted outside the object store.
- Orphan objects (not referenced by any index) are forbidden.
- Enforcement: `check:replay-object-store`.

### Guardrail 59 — Temp Quota Enforcement

- Temp artifacts must live under `CHERRY_TMP_ROOT` and remain below the 5GB quota.
- Enforcement: `check:temp-quota`.

### Guardrail 61 — Temp Root Shape

- `CHERRY_TMP_ROOT` may only contain the bucket directories: `npm`, `next`, `prisma`, `guardrails`.
- No files or symlinks are allowed at the temp root.
- Enforcement: `check:tmp-root-shape`.

### Guardrail 60 — Artifact Size Budgets

- Artifact size budgets are hard caps; failures are expected signals.
- Temp budgets are enforced per bucket as defined in `artifact-budgets.policy.json`.
- Enforcement: `check:artifact-size-budgets`.
- Storage doctrine and failure modes are defined in `docs/storage-doctrine.md`.

### Guardrail 16 — Doctrine Presence

- `docs/doctrine.md` must exist and include a version line (`Version: doctrine_*`) plus the Exit criteria block.
- Guardrail check: `check:doctrine-present`.

### Guardrail 56 — AGENTS Doctrine Link

- AGENTS.md must defer to `docs/doctrine.md` for execution invariants.
- Guardrail check: `check:agents-doctrine-link`.

### Guardrail 52 — Engine Version Gates

- Engine version gates in `lib/engine/version.ts` must match policy pins.
- Engine fixture hashes must match the engine-freeze policy.
- Guardrail check: `check:engine-version-gates`.

### Guardrail 53 — Engine Version Bump Required

- Engine-sensitive changes require a version bump and an engine-freeze baseline bump in a separate `chore(engine-freeze)` commit.
- Guardrail check: `check:engine-version-bump`.

### Guardrail 57 — Engine Version Import Restriction

- Imports of `lib/engine/version.ts` are limited to EngineInput and engine entrypoints.
- Guardrail check: `check:engine-version-imports`.

## Meta-Guardrails (Guardrail System Integrity)

These guardrails exist to ensure the guardrail system itself cannot drift, fork, or be bypassed.

### Guardrail 14 — Guardrail Self-Consistency

- Guardrail scripts (registry `check:*` entries) must obey all active guardrails.
- No implicit booleans, `any`, branded literals, wall-clock time, or unsafe casts in guardrail scripts.
- Guardrail checks: `check:guardrail-self` and `tests/node/guardrails/guardrail-self-consistency.test.ts`.

### Guardrail 17 — Execution Exclusivity

- Guardrail scripts may only be executed via the `check:guardrails` entrypoint.
- Direct references to guardrail script file paths are forbidden in package scripts, workflows, docs, and guardrail code.
- Guardrail scripts are unaddressable by path; they are named capabilities executed via `check:*`.
- Guardrail check: `check:guardrail-execution`.

### Guardrail 18 — Registry Drift Prevention

- Changes to `scripts/guardrails/registry.mts` must include an update to this doc.
- Guardrail check: `check:guardrail-doc-sync`.

### Guardrail 19 — Helper Exclusivity (Guardrail Minimalism)

- One failure API: `scripts/guardrails/lib/fail.mts`.
- One JSON API: `scripts/guardrails/lib/read-json.mts`.
- One import API: `scripts/guardrails/lib/import-typed.mts`.
- One subprocess API: `scripts/guardrails/lib/run-tool.mts`.
- Zero allowlists, zero parallel helper stacks.
- Guardrail check: `check:guardrail-helpers-exclusive`.

**Invariant — Helper Exclusivity**
All guardrail and script helpers must be imported exclusively from
`scripts/guardrails/lib/*`.
Any duplication is a hard CI failure.

### Guardrail 51 — Commit Scope Isolation

- Staged file paths must match the commit category prefix (`engine:`, `guardrails:`, `docs:`, `tests:`, `chore(engine-freeze):`).
- Guardrail check: `check:change-isolation`.

### Guardrail 20 — Subprocess Totality

- Guardrail scripts must execute tools via `scripts/guardrails/lib/run-tool.mts`.
- Direct use of `child_process`, `spawn`, `exec`, or `execa` inside guardrail code is forbidden.
- Guardrail check: `check:guardrail-subprocess-totality`.

### Guardrail 21 — Name/Path Bijection
- Legacy identifier; canonical definition lives under “Invariant A — Name ↔ Path Bijection.”

- Guardrail names must map to canonical script filenames: `check:<name>` → `check-<name>.mts` with `:` normalized to `-` under `scripts/`.
- Guardrail check: `check:guardrail-name-path-bijection`.

### Guardrail 22 — CI Truth Entry Point

- CI must include a step that runs `npm run ci:verify`.
- The last non-empty command in the CI job must be `npm run ci:verify`.
- CI must not invoke other npm scripts directly; `ci:verify` is the only entrypoint.
- Guardrail checks: `check:ci-must-run-check`, `check:ci-guardrail-coverage`.

### Guardrail 23 — Execution Registry Completeness

- Non-guardrail scripts that reference `scripts/` must be registered in `scripts/execution/registry.mts`.
- Registry entries must exist on disk and be present in `package.json` with a runner invocation.
- Execution script files under `scripts/` must be registered or deleted (no allowlists).
- Guardrail checks: `check:execution-registry-completeness`, `check:no-orphan-scripts`.

### Guardrail 24 — Orphan Check Files

- Any `check-*` file under `scripts/` must be registered in the guardrail registry.
- Guardrail check: `check:no-orphan-check-files`.

### Guardrail 25 — ESM Loader Totality
- Legacy identifier; canonical definition lives under “Guardrail 7 — ESM Loader Totality.”

**ESM Loader Totality Invariant**
- Any custom Node ESM loader hook (`load`, `resolve`) must be structurally total: no implicit fallthrough, no bare `return`, no `undefined` returns.
- Sync hooks must not return Promises.
- Loader hooks must return a valid `{ source }` object or delegate to the provided default hook.
- Guardrails: `check:esm-loader-totality`, `check:prisma-mock-loader-totality`.

### Guardrail 26 — Tool Determinism

**Tool Determinism Invariant**
- External tools (`rg`, `git`, `node`) must be preflight-checked before guardrail execution.
- All external tools must be invoked exclusively via `scripts/guardrails/lib/run-tool.mts`.
- Missing tools are fatal and must fail with actionable output.
- Guardrail: `check:guardrail-subprocess-totality`.

### Guardrail 27 — Guardrail Execution Invariant

**Guardrail Execution Invariant**
- Guardrails must be pure, deterministic, and executable in CI without external dependencies.
- Runtime I/O (network, sockets, filesystem writes, database clients) is forbidden.
- Guardrail: `check:guardrail-no-runtime-io`.

## Domain: Tooling & Script Contracts

### Guardrail 28 — TS Project Coverage

- Every TS source file must be owned by exactly one tsconfig project.
- Orphans and overlaps are CI failures.
- Guardrail: `check:ts-coverage`.

### Guardrail 29 — Script Import Policy

- Node scripts must use runtime extensions (`.js`/`.mjs`/`.cjs`) and relative imports.
- TS extension specifiers and `@/` aliases are forbidden in scripts.
- Guardrails: `check:no-ts-extension-imports`, `check:no-script-alias-imports`.

### Guardrail 30 — ESM Import Extensions

- All relative import/export specifiers must include runtime extensions.
- Applies to app, components, lib, scripts, tests, and runtime configs.
- Guardrail: `check:esm-imports`.

### Guardrail 31 — Type-Only Import Enforcement

- Symbols referenced only in type positions must use `import type` or `import { type ... }`.
- Prevents runtime graph pollution and ensures explicit ESM boundaries.
- Guardrail: `check:type-only-imports`.

### Guardrail 32 — Check Contract

- `ci:verify` must run `check`, `test`, and `build` in order.
- `check` must remain pure (no env-dependent scripts).
- `test` and `build` must not invoke guardrails; use `test:strict` and `build:strict` when needed.
- Guardrail: `check:check-contract`.

### Guardrail 33 — Script Runner Contract

- Package scripts that invoke files under `scripts/` must go through `npm run ts:esm`.
- Direct `node`, `tsx`, or `ts-node` usage in script commands is forbidden.
- Guardrail: `check:script-runner-contract`.

## Future/Target behavior

- TODO: Expand guardrail coverage and tests as new risk areas are identified.

## Related docs
- `docs/ci-and-guardrails.md`
- `docs/script-standards.md`
- `scripts/guardrails/registry.mts`
- `scripts/guardrails/run.mts`
