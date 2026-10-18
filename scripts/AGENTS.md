# scripts — scoped rules

Root contract: `../AGENTS.md`. Standards: `../docs/script-standards.md`, `../docs/guardrails.md`. This file adds only what you need to add or change a script without tripping the meta-guardrails.

## Two registries, one runner
- Guardrails: a `check-<name>.mts` file at the top of `scripts/`, registered as `check:<name>` in `guardrails/registry.mts`, plus an identical `"check:<name>": "npm run ts:esm -- scripts/guardrails/run.mts check:<name>"` line in `package.json`, plus an entry in `docs/guardrails.md` in the same change (`check:guardrail-doc-sync`, `check:guardrail-name-path-bijection`, `check:no-orphan-check-files`).
- Execution scripts: any other script, registered in `execution/registry.mts` and exposed as `"<prefix>:<name>": "npm run ts:esm -- scripts/execution/run.mts <prefix>:<name>"`. Allowed prefixes: `check: ingest: audit: backfill: cleanup: report: tmp: generate: verify:` (`check:no-orphan-scripts`).
- Everything runs through `npm run ts:esm -- ...` (`CHERRY_TSESM=1`, `tsconfig.scripts.json`); scripts call `ensureTsEsm()` first. Forward args with `--`.

## Rules the meta-guardrails enforce on script code
- Guardrail scripts (`check-<name>.mts`, `guardrails/**`) may not import `lib/**`; read source text or JSON instead (`check:environment-import-integrity`, `check:guardrail-no-runtime-io`). Execution scripts may import `lib/**` but not `app/**` or `components/**`.
- JSON via `guardrails/lib/read-json.mts` + a Zod schema; never `JSON.parse`. Subprocesses via `guardrails/lib/run-tool.mts`. Failures via `guardrails/lib/fail.mts` with `PREFIX` and `FIX`.
- `catch (error: unknown)`; no `any`; explicit boolean conditions (`x.length > 0`, not `if (x)`); no `Date.now()` in guardrails.
- Imports use `.mjs` extensions that resolve to `.mts`; no `@/` aliases; no `.ts` extensions.
- Guardrails are read-only, deterministic, no network.
- Docs must not reference a check script by file path; name the npm script (`check:<name>`) instead (`check:guardrail-execution`).

## Self-tests
Add `tests/node/guardrails/<name>.test.ts` that spawns the guardrail via `npm run ts:esm` against a fixture under `tests/fixtures/guardrails/` (most checks accept a `CHERRY_<NAME>_ROOT` or fixture env override) and asserts a non-zero exit plus the expected message.

## Useful entry points
- `npm run check:<name>` runs one guardrail; `npm run check:guardrails` runs the core tier; `npm run check:env` the env tier.
- `npm run report:domain-impact -- <paths>` maps files to domains and tests.
- `CHERRY_DOMAIN_BOUNDARIES_REPORT=1 npm run check:domain-boundaries` prints cross-domain edge counts.
