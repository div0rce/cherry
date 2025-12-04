Status: Draft
Last updated: 2025-12-04

# CI and guardrails

## Pipeline
- Runs on every push to `main` and all PRs via `.github/workflows/ci.yml`.
- Steps (fail-fast):
  1) `npm ci`
  2) `npx prisma generate`
  3) `npm run check:guardrails` (anti-regression)
  4) `npm run lint`
  5) `npm run typecheck`
  6) `npm run typecheck:scripts`
  7) `npm test` (includes `check:prisma-assumptions`)
  8) `npm run build`
- Tests run with `DATABASE_URL=file:./tmp/test.db` for isolation.

## Guardrails enforced
- ESLint rules must stay strict (`eslint.config.mjs`): Zod strictness, unsafe-any rules, strict-boolean-expressions, and JSON.parse bans.
- TypeScript strict flags in `tsconfig.json` must remain `true`.
- No new `eslint-disable` outside the allowlist captured in `scripts/check-guardrails.ts`; fix the code instead of silencing rules.
- Package scripts (`lint`, `typecheck`, `test`, `check:guardrails`, etc.) must exist and keep their chaining.
- Guardrail files/tests must not be removed (offline evaluator, ingest, engine tests, Prisma assumptions).
- `scripts/check-guardrails.ts` exits non-zero on any deviation; CI treats that as a hard failure.

## How to run locally
```bash
npm run check:guardrails
npm run lint
npm run typecheck
npm run typecheck:scripts
npm test
```

## Fix policy
- If guardrails fail, fix the code/configuration to comply. Do **not** relax rules, add `eslint-disable`, or drop tests.
- Any change to guardrails must be documented and justified; weakening them is not allowed.
