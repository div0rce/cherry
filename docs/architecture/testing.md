Status: Active
Last updated: 2026-09-22

# Testing and Verification

## Layout
| Directory | Kind | Run by |
| --- | --- | --- |
| `tests/node/**` | Pure unit, contract, accounting, determinism, migration-SQL, guardrail self-tests (`tests/node/guardrails/**` run each `check:<name>` guardrail against `tests/fixtures/guardrails/**`) | `npm run check:tests:node` (inside `npm run check`), `npm test` |
| `tests/next/**` | API route handlers and UI contracts with `next/server` mocked and Prisma mocked | `npm run check:tests:next` (inside `npm run check`), `npm test` |
| `tests/db/**` | Real PostgreSQL: constraint existence, impossibility, conservation only (`AGENTS.md` DB truth surface) | `npm run test:db` (needs `DATABASE_URL`; CI `env-checks.yml`) |
| `tests/node/accounting/*.spec.ts`, `tests/engine/optimality/*.spec.ts` | Property/oracle proofs | guardrails `check:accounting-invariants`, `check:no-mutation`, `check:replay-equals-materialized`, `check:engine-optimality` |
| `tests/*.test.*`, `tests/guardrails/**`, `tests/authority/**`, `tests/migrations/**`, `tests/type/**` | Legacy copies of the `tests/node` / `tests/next` files (see Known issues) | `npm test` only |

No test framework. Files are plain scripts using `node:assert/strict`; a file passes if it exits 0.
Prisma is replaced by the mock in `scripts/lib/` through a loader, so nothing under `tests/node` or `tests/next` proves database behaviour.

## Verification levels
| Level | Command | Proves |
| --- | --- | --- |
| FAST | one file: `TZ=UTC npm run ts:esm -- --import ./scripts/lib/loaders/config.loader.mjs --import ./scripts/lib/loaders/prisma-mock.register.mjs -r tsconfig-paths/register tests/node/<file>` | that file only |
| DOMAIN | `npm run report:domain-impact -- <changed paths>` prints the globs, then `npm run check:tests:node -- --filter=<glob,glob>` and `npm run check:tests:next -- --filter=<glob>` | the owning domain's registered tests. Output is labelled `FILTERED RUN`; never cite it as the gate |
| FULL | `npm run check && npm test && npm run build` (what `npm run ci:verify` runs) | the authoritative contract. `check` = core guardrails + lint + typecheck + node tests + next tests |
| DB | `npm run test:db` with a real Postgres and applied migrations | schema constraints |

Required environment for FULL locally: `CHERRY_TMP_ROOT` (an existing dir, mode 700) and `CHERRY_VINE_SIGNATURE_MODE=enforce` (the build asserts production config). Guardrails need `rg`, `git`, `node` on PATH.

## Where the tests for a domain are
`scripts/guardrails/domains.manifest.json` `tests` field, rendered in `domains.md`, printed by `report:domain-impact`. Adding a test for a domain means adding it under `tests/node` or `tests/next` and, if it introduces a new file pattern, adding the glob to the manifest (the guardrail fails on globs that match nothing, so the list stays real).

## Known issues (verified 2026-09-22)
- 110 legacy test files at `tests/*.test.*`, `tests/guardrails`, `tests/authority`, `tests/migrations`, `tests/type` duplicate files in `tests/node` / `tests/next`; 2 pairs have diverged in logic (`engine-solver`, `api-sessions.user-context`). `check:guardrails-core` requires several of the legacy paths to exist, so removing them needs a guardrail update in the same change. `check:engine-optimality` runs the legacy `tests/engine/optimality` copy; `tests/node/engine/optimality` and `tests/accounting` run nowhere.
- CI runs node and next tests three times (`check:tests:*`, then `ci:verify` -> `check` and `test`).

## Related docs
- `AGENTS.md` (PR checklist), `docs/ci-and-guardrails.md`, `docs/guardrails.md`
