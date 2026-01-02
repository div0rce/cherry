Status: Draft
Last updated: 2026-01-02

# CI and guardrails

## Current behavior

### Pipeline
- Runs on every push to `main` and all PRs via `.github/workflows/ci.yml`.
- Steps (fail-fast):
  1) `npm ci` (postinstall runs `prisma generate`)
  2) `npm run ci:verify` (composite truth gate: check + test + build)
- Optional env lane (`.github/workflows/env-checks.yml`) runs `CHERRY_STRICT=1 npm run check:env` when secrets are available.

### Why CI Runs `npm run ci:verify`

- CI does not enumerate guardrails.
- CI runs one authority: `npm run ci:verify`.
- `check:guardrails` guarantees registry completeness, execution exclusivity, CI coverage, and ordering stability.
- `check` stays pure (guardrails + lint + typecheck); env checks live in `check:env`.
- The last non-empty command in the CI job must be `npm run ci:verify`.

> If CI ever runs individual guardrail scripts directly, the system is broken.

### Guardrails enforced
- ESLint rules must stay strict (`eslint.config.mjs`): Zod strictness, unsafe-any rules, strict-boolean-expressions, and JSON.parse bans.
- TypeScript strict flags in `tsconfig.json` must remain `true`.
- No new `eslint-disable` outside the allowlist captured in `check:guardrails-core`; fix the code instead of silencing rules.
- Package scripts (`lint`, `typecheck`, `test`, `check:guardrails`, etc.) must exist and keep their chaining.
- Guardrail files/tests must not be removed (offline evaluator, ingest, engine tests, Prisma assumptions).
- Guardrail 5 (implicit config): `process.env` access is confined to `app/api/**` and `scripts/**`; load env into typed config via `initConfigFromEnv` and thread it explicitly. `check:config` must pass without allowlists.
- Guardrail 6 (config immutability): server config is deep-frozen and locked after boundary load; `setServerConfig` rejects writes post-lock and loader registration fails once locked. `check:config-lock` must pass.
- `check:check-contract` enforces the `ci:verify` contract and keeps `check` pure.
- `check:ci-must-run-check` enforces the single CI entrypoint (`ci:verify`).
- `check:guardrails-core` exits non-zero on any deviation; CI treats that as a hard failure.

### How to run locally

Run the npm scripts: `check` (pure), `test`, `build`, or the full gate `ci:verify`.

## Future/Target behavior

- TODO: Document CI changes when guardrail phases or environment requirements evolve.
