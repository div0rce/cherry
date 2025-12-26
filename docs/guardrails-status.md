Status: Active
Last updated: 2025-12-25

# Guardrails Status

## Scoreboard (Guardrails 1–12)

| Guardrail # | Name | Enforcement (eslint/script/test/ci) | Fixtures (pos/neg) | CI wired? | Status / Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | Randomness ban in `lib/**` | script (`scripts/check-repo-guardrails.js`), tests, ci | neg only | yes | enforced in `lib/**` except `lib/adapters/runtime/**` |
| 2 | Sorting without comparator | script (`scripts/check-no-implicit-ordering.mts`), tests, ci | neg only | yes | enforced via guardrail tests (no ESLint selector yet) |
| 3 | Floating-point money math | repo script, tests, ci | pos+neg | yes | enforced forward; legacy allowlist present |
| 4 | No silent defaults in core | eslint, repo script, tests, ci | pos+neg | yes | enforced |
| 5 | Exhaustive switches | eslint, ci | none | yes | enforced via ESLint `switch-exhaustiveness-check` |
| 6 | Engine purity (no side effects) | scripts (`check-no-engine-date.mts`, `check-no-engine-prisma.mts`), repo backstop, ci | neg only | yes | partial (console/network not yet covered) |
| 7 | Engine must not import Prisma | script (`check-no-engine-prisma.mts`), repo backstop, ci | neg only | yes | enforced |
| 8 | Idempotent writes | tests (`tests/idempotency*.test.*`), ci | neg only | yes | partial (session/ledger coverage pending) |
| 9 | Time-free tests | script (`check-no-implicit-time.mts`), tests, ci | neg only | yes | partial (no global fake timers) |
| 10 | SSR/user-page runtime purity | script (`check-user-pages-runtime-only.mts`), repo backstop, tests, ci | pos+neg | yes | enforced for `app/(user)` boundaries |
| 11 | Migration safety | none | none | no | not implemented |
| 12 | Policy totality | none | none | no | not implemented |

## Backstops / Boundary Guardrails (non-numbered)

- Repo backstop: `scripts/check-repo-guardrails.js` (randomness/time/engine-prisma + boundary checks)
- Side-effects boundary: `scripts/check-no-side-effects.mts` (allowlist-driven)
- Script module semantics: `scripts/check-script-module-semantics.mts`
- Config/identity/entropy backstops: `scripts/check-no-implicit-config.mts`, `scripts/check-no-implicit-identity.mts`, `scripts/check-no-server-entropy.mts`
- Boundary layer frozen as of commit `c2fcb7ab7bd65962d743269d310758995a2ded52`.

## Command Gate (latest run)

- `npm run check:repo-guardrails`: pass
- `npm run lint`: pass
- `npm run typecheck`: pass
- `npm test`: pass
- `npm run build`: pass
