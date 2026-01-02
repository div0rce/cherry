Status: Active
Last updated: 2026-01-03

# Guardrails

## Current behavior
- Guardrail and execution script registration is mandatory; registries are the only authority.
- CI runs `npm run ci:verify` as the sole truth gate; `check` remains pure (guardrails + lint + typecheck), and env checks live in `check:env`.
- Script conventions (no raw JSON.parse, no any, .mts only under scripts) live in `docs/script-standards.md`.
- Guardrail checks now enforce JSON.parse bans in scripts and npm arg forwarding (`check:script-json-parse`, `check:npm-arg-forwarding`).

## Guardrail Registry Invariants (Authoritative)

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

### Guardrail 6 — Config Immutability

- Server config is constructed once at the boundary (app/api or scripts) and then deep-frozen; `lockServerConfig()` prevents any subsequent mutation or re-registration.
- `setServerConfig()` throws after lock even with `allowOverwrite`; loaders cannot be registered once locked.
- Public and runtime configs are also deep-frozen on set to block incidental mutation during a request/job.
- Boundaries should call `initConfigFromEnv()` (app/api routes, scripts, test bootstrap) before doing work; this sets the config and locks it by default outside tests.
- Tests may inject configs with `allowOverwrite: true, lock: false` before calling `lockServerConfig()` to mimic boundary assembly; no fallback-to-env is permitted after lock.
- Guardrail check: `check:config-lock` asserts locking, immutability, and loader rejection.

### Authority `inputsVersion` Stability

`inputsVersion` is deterministic for a fixed `(engineVersion, inputs, snapshot)`. It is not
guaranteed to remain stable across different `engineVersion` values. Consumers must not compare
`inputsVersion` values across engine versions.

### Guardrail 7 — ESM Loader Totality

- ESM loader hooks must be total: every branch returns a valid `{ format, source }` or delegates to `defaultLoad`.
- Loader hooks must never return `undefined` sources; prefer deterministic sentinel modules for tests.
- Sentinel paths are allowed only under `CHERRY_TEST_LOADER_SENTINEL=1` and must return valid modules.
- Guardrail checks: `check:loader-contract` and `tests/guardrails/esm-loader-contract.test.ts`.

### Guardrail 8 — Guardrail Event Totality

- Guardrail events must include `timestamp` and `timestampSource` (`boundary` | `client` | `engine`).
- API routes must emit `timestampSource: boundary`; client components must emit `timestampSource: client`.
- Guardrail checks: `check:guardrail-time` and `tests/guardrails/guardrail-event-totality.test.ts`.

### Guardrail 9 — Prisma Adapter Readiness

- Prisma-backed adapters must assert model availability before reads/writes.
- Missing models throw `AppError('INTERNAL', 'Missing Prisma model: <name>', 500)` deterministically.
- Guardrail tests: `tests/guardrails/prisma-adapter-totality.test.ts`.

### Guardrail 10 — Side-Effect Expiration

- `legacy-combo` allowlist entries require `expiresBy: YYYY-MM-DD`.
- CI fails when expired, removed, or increased.
- Guardrail checks: `check:side-effects:diff`.

### Guardrail 11 — Engine Boundary No-Throw

- Engine-facing APIs (`safeSolveDecisionForWorld`, `simulateSpendAuthority`) must never throw.
- Invalid inputs return structured outcomes, not exceptions.
- Guardrail tests: `tests/guardrails/engine-no-throw.test.ts`.

### Guardrail 12 — Boolean Totality

- No implicit truthiness checks on non-boolean values.
- Conditionals must compare explicitly (`===`, `!==`, `<`, `>`) or use typed helpers.
- Guardrail checks: `check:implicit-boolean` and `tests/guardrails/no-implicit-boolean.test.ts`.

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

Guardrail checks: `check:branded-literal` and `tests/guardrails/branded-type-enforcement.test.ts`.

### Guardrail 14 — Guardrail Self-Consistency

- Guardrail scripts (registry `check:*` entries) must obey all active guardrails.
- No implicit booleans, `any`, branded literals, wall-clock time, or unsafe casts in guardrail scripts.
- Guardrail checks: `check:guardrail-self` and `tests/guardrails/guardrail-self-consistency.test.ts`.

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

### Guardrail 20 — Subprocess Totality

- Guardrail scripts must execute tools via `scripts/guardrails/lib/run-tool.mts`.
- Direct use of `child_process`, `spawn`, `exec`, or `execa` inside guardrail code is forbidden.
- Guardrail check: `check:guardrail-subprocess-totality`.

### Guardrail 21 — Name/Path Bijection

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

### Guardrail 28 — TS Project Coverage

- Every TS source file must be owned by exactly one tsconfig project.
- Orphans and overlaps are CI failures.
- Guardrail: `check:ts-coverage`.

### Guardrail 29 — Script Import Policy

- Node scripts must use runtime extensions (`.js`/`.mjs`/`.cjs`) and relative imports.
- TS extension specifiers and `@/` aliases are forbidden in scripts.
- Guardrails: `check:no-ts-extension-imports`, `check:no-script-alias-imports`.

### Guardrail 30 — Check Contract

- `ci:verify` must run `check`, `test`, and `build` in order.
- `check` must remain pure (no env-dependent scripts).
- `test` and `build` must not invoke guardrails; use `test:strict` and `build:strict` when needed.
- Guardrail: `check:check-contract`.

### Guardrail 31 — Script Runner Contract

- Package scripts that invoke files under `scripts/` must go through `npm run ts:esm`.
- Direct `node`, `tsx`, or `ts-node` usage in script commands is forbidden.
- Guardrail: `check:script-runner-contract`.

## Future/Target behavior

- TODO: Expand guardrail coverage and tests as new risk areas are identified.
