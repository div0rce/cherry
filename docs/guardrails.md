Status: Draft
Last updated: 2025-12-25

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
