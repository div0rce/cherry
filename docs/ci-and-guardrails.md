Status: Active
Last updated: 2026-04-28

# CI and guardrails

## Current behavior

### Pipeline
- Runs on every push to `main` and all PRs via `.github/workflows/ci.yml`.
- Steps (fail-fast):
  1) `npm ci` (postinstall runs `prisma generate`)
  2) `npm run check:guardrails`
  3) `npm run ci:verify` (composite truth gate: check + test + build)
- Optional env lane (`.github/workflows/env-checks.yml`) provisions Postgres and runs:
  - `npx prisma generate`
  - `npx prisma migrate deploy`
  - `npx prisma migrate status`
  - `npm run check:env`
  - `npm run test:db`
  - `prisma generate` is intentionally duplicated here to validate schema generation under a live database and migration context.

### Why CI Runs `npm run ci:verify`

- CI does not enumerate guardrails.
- CI runs one authority: `npm run ci:verify`.
- `check:guardrails` guarantees registry completeness, execution exclusivity, CI coverage, and ordering stability.
- `check` is the aggregate of guardrails + node correctness + UI correctness; env checks live in `check:env`.
- The last non-empty command in the CI job must be `npm run ci:verify`.
- There must be exactly one canonical runtime execution per CI run: `ci:verify` reaches `npm test`, and `npm test` runs root legacy tests, `tests/node`, then `tests/next`.
- CI must not directly run node/next runtime test steps outside `ci:verify`.

### Temp root requirement
- `CHERRY_TMP_ROOT` is required for all guardrails and scripts that allocate temp.
- Local dev: export `CHERRY_TMP_ROOT` from your shell, direnv, or launch configuration instead of storing it in a repo-root env file.
- CI: workflows must set `CHERRY_TMP_ROOT` and create the directory before installs.
- Vercel: set `CHERRY_TMP_ROOT=/tmp/cherry-tmp` and ensure the build command creates the directory.
- Enforcement: `check:temp-quota`, `check:tmp-root-shape`, `check:artifact-size-budgets`.

### Vine production-signature env
- Production build verification requires `CHERRY_VINE_SIGNATURE_MODE=enforce`.
- CI sets `CHERRY_VINE_SIGNATURE_MODE=enforce` explicitly in workflow env.
- Vercel/deploy env must set `CHERRY_VINE_SIGNATURE_MODE=enforce`; no wrapper-only default or fallback may stand in for the deployment env.
- The exact policy is enforced by `lib/config/server.ts`: production config fails unless Vine signature mode is `enforce`.
- Local repo closure:
  ```bash
  export CHERRY_TMP_ROOT="$HOME/.cherry-tmp"
  mkdir -p "$CHERRY_TMP_ROOT"
  chmod 700 "$CHERRY_TMP_ROOT"
  export CHERRY_VINE_SIGNATURE_MODE=enforce
  npm run verify:repo-closure
  ```

### `verify:repo-closure` contract
- `npm run verify:repo-closure` asserts `CHERRY_TMP_ROOT` exists, is writable, and is empty, a dedicated Cherry system-temp directory, or already contains only the repo temp buckets `npm`, `next`, `prisma`, and `guardrails`.
- It asserts `CHERRY_VINE_SIGNATURE_MODE=enforce` from the config code contract with no defaults, fallback values, or weakening of enforcement.
- It prints exact local export commands on failure.
- It does not mutate env in a way production would not.
- It runs the Issue 8 proof slice, then `npm run lint`, `npm run check`, `npm run typecheck`, `npm test`, and `npm run build`.

> If CI directly runs node/next runtime tests outside `ci:verify`, the system is broken.

### Ordering invariant
- Guardrails execute before env-specific correctness and build.
- `check:guardrails` runs core (env-free) guardrails; `check:env` runs env-dependent guardrails plus DB requirements.
- Inside `check:node` and `check:next`, lint runs before typecheck and typecheck runs before tests.
- `npm test` is the partitioned full runtime runner, and ownership is enforced by `tests/node/guardrails/test-runner-ownership.test.ts`.
- Build executes after `check` completes.

### Guardrails enforced
- ESLint rules must stay strict (`eslint.config.mjs`): Zod strictness, unsafe-any rules, strict-boolean-expressions, and JSON.parse bans.
- TypeScript strict flags in `tsconfig.json` must remain `true`.
- No new `eslint-disable` outside the allowlist captured in `check:guardrails-core`; fix the code instead of silencing rules.
- Package scripts (`lint`, `typecheck`, `test`, `check:guardrails`, etc.) must exist and keep their chaining.
- Guardrail files/tests must not be removed (offline evaluator, ingest, engine tests, Prisma assumptions).
- Guardrail 5 (implicit config): `process.env` access is confined to `app/api/**` and `scripts/**`; load env into typed config via `initConfigFromEnv` and thread it explicitly. `check:config` must pass without allowlists.
- Guardrail 6 (config immutability): server config is deep-frozen and locked after boundary load; `setServerConfig` rejects writes post-lock and loader registration fails once locked. `check:config-lock` must pass.
- `check:check-contract` enforces the `ci:verify` contract and keeps `check` pure.
- `check:ci-must-run-check` enforces fail-fast guardrails before the final CI entrypoint (`ci:verify`) and forbids direct runtime test execution in CI.
- `check:ci-guardrail-coverage` enforces the transitive proof chain from CI to `ci:verify`, `npm test`, and `check:run-tests`.
- `check:guardrails-core` exits non-zero on any deviation; CI treats that as a hard failure.

### Guardrail scope invariant
- Guardrails must be read-only.
- Guardrails must not mutate the repo, generate artifacts, or depend on network I/O.
- Guardrails may inspect files, configs, and scripts only.

### How to run locally

Use the narrowest proof that fully covers the changed surface:
- `npm run check:static` for guardrails, lint, and typecheck.
- `npm run check:runtime` or `npm test` for the partitioned runtime suite.
- `npm run check:fast` for local guardrails + script typecheck + runtime suite.
- `CHERRY_TMP_ROOT="$HOME/.cherry-tmp" CHERRY_VINE_SIGNATURE_MODE=enforce npm run verify:repo-closure` for canonical full proof.

Agents must not blindly stack `npm run check`, `npm test`, `npm run build`, and `verify:repo-closure`; do not run both `npm test` and `verify:repo-closure` unless explicitly required.

### What CI green means (DB posture)
- Standard CI (`ci:verify`) does not exercise a live database; tests run with Prisma mocked.
- The env lane validates migrations, connectivity, and a minimal DB smoke test, but it is not a full integration suite.
- Treat DB correctness as a separate contract: run migrations locally and exercise DB paths explicitly when changing schema or persistence logic.

## Future/Target behavior

- TODO: Document CI changes when guardrail phases or environment requirements evolve.
- TODO: Add an integration lane that exercises critical DB flows with real migrations.

## Related docs
- `docs/guardrails.md`
- `docs/env-policy.md`
- `docs/script-standards.md`
- `.github/workflows/ci.yml`
- `.github/workflows/env-checks.yml`
