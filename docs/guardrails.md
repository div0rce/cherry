Status: Draft
Last updated: 2025-12-26

# Guardrail 6 — Config Immutability

- Server config is constructed once at the boundary (app/api or scripts) and then deep-frozen; `lockServerConfig()` prevents any subsequent mutation or re-registration.
- `setServerConfig()` throws after lock even with `allowOverwrite`; loaders cannot be registered once locked.
- Public and runtime configs are also deep-frozen on set to block incidental mutation during a request/job.
- Boundaries should call `initConfigFromEnv()` (app/api routes, scripts, test bootstrap) before doing work; this sets the config and locks it by default outside tests.
- Tests may inject configs with `allowOverwrite: true, lock: false` before calling `lockServerConfig()` to mimic boundary assembly; no fallback-to-env is permitted after lock.
- Guardrail check: `npm run check:config-lock` (`scripts/check-config-locking.mts`) asserts locking, immutability, and loader rejection.

## Authority `inputsVersion` Stability

`inputsVersion` is deterministic for a fixed `(engineVersion, inputs, snapshot)`. It is not
guaranteed to remain stable across different `engineVersion` values. Consumers must not compare
`inputsVersion` values across engine versions.

# Guardrail 7 — ESM Loader Totality

- ESM loader hooks must be total: every branch returns a valid `{ format, source }` or delegates to `defaultLoad`.
- Loader hooks must never return `undefined` sources; prefer deterministic sentinel modules for tests.
- Sentinel paths are allowed only under `CHERRY_TEST_LOADER_SENTINEL=1` and must return valid modules.
- Guardrail checks: `npm run check:loader-contract` and `tests/guardrails/esm-loader-contract.test.ts`.

# Guardrail 8 — Guardrail Event Totality

- Guardrail events must include `timestamp` and `timestampSource` (`boundary` | `client` | `engine`).
- API routes must emit `timestampSource: boundary`; client components must emit `timestampSource: client`.
- Guardrail checks: `npm run check:guardrail-time` and `tests/guardrails/guardrail-event-totality.test.ts`.

# Guardrail 9 — Prisma Adapter Readiness

- Prisma-backed adapters must assert model availability before reads/writes.
- Missing models throw `AppError('INTERNAL', 'Missing Prisma model: <name>', 500)` deterministically.
- Guardrail tests: `tests/guardrails/prisma-adapter-totality.test.ts`.

# Guardrail 10 — Side-Effect Expiration

- `legacy-combo` allowlist entries require `expiresBy: YYYY-MM-DD`.
- CI fails when expired, removed, or increased.
- Guardrail checks: `npm run check:side-effects:diff`.

# Guardrail 11 — Engine Boundary No-Throw

- Engine-facing APIs (`safeSolveDecisionForWorld`, `simulateSpendAuthority`) must never throw.
- Invalid inputs return structured outcomes, not exceptions.
- Guardrail tests: `tests/guardrails/engine-no-throw.test.ts`.
