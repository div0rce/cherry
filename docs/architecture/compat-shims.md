# Compat shims policy

Purpose:
Keep strict typing while upstream packages ship incomplete or unstable type surfaces.

Invariants:
- Each `declare module 'X'` exists in exactly one file.
- No shim introduces globals except `types/jsx-global.d.ts`.
- Scripts TS program only includes compat shims it actually needs.

Upgrade procedure:
1) Upgrade dependency.
2) Run `npm run check`.
3) If a shim becomes unnecessary, delete it.
4) If a shim must remain, keep it minimal and scoped to the exact missing surface.

Smell:
- Package-level augmentation (`declare module 'nodemailer'`) should be rare and justified.
