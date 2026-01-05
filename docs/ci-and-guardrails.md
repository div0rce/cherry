Status: Active
Last updated: 2026-01-03

# CI and guardrails

## Current behavior

### Pipeline
- Runs on every push to `main` and all PRs via `.github/workflows/ci.yml`.
- Steps (fail-fast):
  1) `npm ci` (postinstall runs `prisma generate`)
  2) `npm run ci:verify` (composite truth gate: check + test + build)
- Optional env lane (`.github/workflows/env-checks.yml`) provisions Postgres and runs:
  - `npx prisma generate`
  - `npx prisma migrate deploy`
  - `npx prisma migrate status`
  - `CHERRY_STRICT=1 npm run check:db:required`
  - `prisma generate` is intentionally duplicated here to validate schema generation under a live database and migration context.

### Why CI Runs `npm run ci:verify`

- CI does not enumerate guardrails.
- CI runs one authority: `npm run ci:verify`.
- `check:guardrails` guarantees registry completeness, execution exclusivity, CI coverage, and ordering stability.
- `check` stays pure (guardrails + lint + typecheck); env checks live in `check:env`.
- The last non-empty command in the CI job must be `npm run ci:verify`.

> If CI ever runs individual guardrail scripts directly, the system is broken.

### Ordering invariant
- Guardrails always execute before lint, typecheck, test, or build.
- Lint executes before typecheck.
- Typecheck executes before tests.
- Tests execute before build.
- No step may reorder or short-circuit this sequence.

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

### Guardrail scope invariant
- Guardrails must be read-only.
- Guardrails must not mutate the repo, generate artifacts, or depend on network I/O.
- Guardrails may inspect files, configs, and scripts only.

### How to run locally

Run the npm scripts: `check` (pure), `test`, `build`, or the full gate `ci:verify`.

### What CI green means (DB posture)
- Standard CI (`ci:verify`) does not exercise a live database; tests run with Prisma mocked.
- The env lane validates migrations and basic connectivity but does not prove application-level DB behavior beyond `check:db:required`.
- Treat DB correctness as a separate contract: run migrations locally and exercise DB paths explicitly when changing schema or persistence logic.

## Future/Target behavior

- TODO: Document CI changes when guardrail phases or environment requirements evolve.
- TODO: Add an integration lane that exercises critical DB flows with real migrations.

## Related docs
- `docs/guardrails.md`
- `docs/script-standards.md`
- `.github/workflows/ci.yml`
- `.github/workflows/env-checks.yml`
