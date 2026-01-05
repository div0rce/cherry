Status: Active
Last updated: 2026-01-02

# Compat shims policy

Purpose: keep strict typing while upstream packages ship incomplete or unstable type surfaces.

## Current behavior (enforced / in code)
- Compat shims live under `types/compat/*` and are scoped to missing surfaces only.
- Guardrails enforce TS project ownership and prevent stray shims.

## Invariants
- Each `declare module 'X'` exists in exactly one file.
- No shim introduces globals except `types/jsx-global.d.ts`.
- Scripts TS program only includes compat shims it actually needs.

## Upgrade procedure
1) Upgrade dependency.
2) Run `npm run check`.
3) If a shim becomes unnecessary, delete it.
4) If a shim must remain, keep it minimal and scoped to the exact missing surface.

## Smell
- Package-level augmentation (`declare module 'nodemailer'`) should be rare and justified.

## Future/Target behavior (explicitly speculative)
- Reduce shim usage as upstream typings improve.

## Related docs
- `docs/ci-and-guardrails.md`
- `types/compat/README.md`
