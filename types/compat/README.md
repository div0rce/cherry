# Compatibility shims

These `.d.ts` files exist to patch upstream typing gaps without weakening repo strictness.

Rules:
1) One file per upstream module path.
2) No duplicate `declare module` targets across the repo.
3) Prefer leaf-module shims (e.g. nodemailer/lib/*) over package-level augmentation.
4) Audit these files on dependency upgrades.

Audit trigger:
- Any change to dependencies touching @auth/*, next-auth, nodemailer, or related transports.
