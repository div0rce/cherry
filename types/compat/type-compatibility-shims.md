Status: Active
Last updated: 2026-01-02

# Type Compatibility Shims

These `.d.ts` files exist to patch upstream typing gaps without weakening repo strictness.

## Current behavior
- Shims live under `types/compat/*` and are kept minimal.

## Rules
1) One file per upstream module path.
2) No duplicate `declare module` targets across the repo.
3) Prefer leaf-module shims (e.g. nodemailer/lib/*) over package-level augmentation.
4) Audit these files on dependency upgrades.

## Audit trigger
- Any change to dependencies touching @auth/*, next-auth, nodemailer, or related transports.

## Future/Target behavior
- Remove shims as upstream types stabilize.

## Related docs
- `docs/architecture/compat-shims.md`
- `docs/ci-and-guardrails.md`
