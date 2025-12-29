Status: Active
Last updated: 2025-12-28

# Guardrails Status

## Current behavior

### Scoreboard (Guardrails 1–12)

| Guardrail # | Name | Enforcement (eslint/script/test/ci) | Fixtures (pos/neg) | CI wired? | Status / Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | Randomness ban in `lib/**` | script (`check:repo-guardrails`), tests, ci | neg only | yes | enforced in `lib/**` except `lib/adapters/runtime/**` |
| 2 | Sorting without comparator | script (`check:ordering`), tests, ci | neg only | yes | enforced via guardrail tests (no ESLint selector yet) |
| 3 | Floating-point money math | repo script, tests, ci | pos+neg | yes | enforced forward; legacy allowlist present |
| 4 | No silent defaults in core | eslint, repo script, tests, ci | pos+neg | yes | enforced |
| 5 | Exhaustive switches | eslint, ci | none | yes | enforced via ESLint `switch-exhaustiveness-check` |
| 6 | Engine purity (no side effects) | scripts (`check:engine-date`, `check:engine-prisma`), repo backstop, tests, ci | pos+neg | yes | enforced (no side effects; pure compute) |
| 7 | Engine must not import Prisma | script (`check:engine-prisma`), repo backstop, ci | neg only | yes | enforced |
| 8 | Idempotent writes | tests (`tests/idempotency*.test.*`), ci | neg only | yes | partial (session/ledger coverage pending) |
| 9 | Time-free tests | script (`check:determinism`), tests, ci | neg only | yes | partial (no global fake timers) |
| 10 | SSR/user-page runtime purity | script (`check:user-pages-runtime`), repo backstop, tests, ci | pos+neg | yes | enforced for `app/(user)` boundaries |
| 11 | Migration safety | repo script, tests, ci | pos+neg | yes | enforced |
| 12 | Policy totality | runtime assertion, tests, ci | pos+neg | yes | enforced (closed verdict set) |

### Backstops / Boundary Guardrails (non-numbered)

- Repo backstop: `check:repo-guardrails` (randomness/time/engine-prisma/engine-side-effects + boundary checks)
- Side-effects boundary: `check:side-effects` (allowlist-driven)
- Script module semantics: `check:script-semantics`
- Config/identity/entropy backstops: `check:config`, `check:identity`, `check:server-entropy`
- Registry closure: `check:guardrail-name-path-bijection`, `check:no-orphan-check-files`, `check:execution-registry-completeness`, `check:no-orphan-scripts`
- CI gate: `check:ci-must-run-check`
- Boundary layer frozen as of commit `c2fcb7ab7bd65962d743269d310758995a2ded52`.

### Command Gate (latest run)

- `check:repo-guardrails`: pass
- `lint`: pass
- `typecheck`: pass
- `test`: pass
- `build`: pass

## Future/Target behavior

- TODO: Expand scoreboard to cover Guardrails 13+ once their fixtures and CI wiring are audited.
