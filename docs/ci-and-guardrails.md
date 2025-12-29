Status: Draft
Last updated: 2025-12-28

# CI and guardrails

## Current behavior

### Pipeline
- Runs on every push to `main` and all PRs via `.github/workflows/ci.yml`.
- Steps (fail-fast):
  1) `npm ci`
  2) `npx prisma generate`
  3) `check:guardrails` (anti-regression)
  4) `lint`
  5) `typecheck`
  6) `typecheck:scripts`
  7) `test` (runs `check:guardrails`, including `check:prisma-assumptions`)
  8) `build`
  9) `check` (composite superset)
- Tests run with `DATABASE_URL=file:./tmp/test.db` for isolation.

### Guardrails enforced
- ESLint rules must stay strict (`eslint.config.mjs`): Zod strictness, unsafe-any rules, strict-boolean-expressions, and JSON.parse bans.
- TypeScript strict flags in `tsconfig.json` must remain `true`.
- No new `eslint-disable` outside the allowlist captured in `check:guardrails-core`; fix the code instead of silencing rules.
- Package scripts (`lint`, `typecheck`, `test`, `check:guardrails`, etc.) must exist and keep their chaining.
- Guardrail files/tests must not be removed (offline evaluator, ingest, engine tests, Prisma assumptions).
- Guardrail 5 (implicit config): `process.env` access is confined to `app/api/**` and `scripts/**`; load env into typed config via `initConfigFromEnv` and thread it explicitly. `check:config` must pass without allowlists.
- Guardrail 6 (config immutability): server config is deep-frozen and locked after boundary load; `setServerConfig` rejects writes post-lock and loader registration fails once locked. `check:config-lock` must pass.
- `check:ci-must-run-check` enforces the composite gate in CI.
- `check:guardrails-core` exits non-zero on any deviation; CI treats that as a hard failure.

### How to run locally

Run the npm scripts: `check:guardrails`, `lint`, `typecheck`, `typecheck:scripts`, `test`.

## Future/Target behavior

- TODO: Document CI changes when guardrail phases or environment requirements evolve.
