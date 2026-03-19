Status: Active
Last updated: 2026-03-17

# Vine security

## Current behavior
- Vine signature verification mode is controlled by `CHERRY_VINE_SIGNATURE_MODE`.
- Allowed modes are `off`, `warn`, and `enforce`.
- `off` is non-production only and disables signature verification.
- `warn` is non-production only and logs signature failures while allowing execution.
- `enforce` rejects invalid signatures and is required in production.
- Production requires `CHERRY_VINE_SIGNATURE_MODE=enforce`.
- Any production config using `off` or `warn` is invalid and fails at config assertion time.
- `/api/vine/order` also enforces this at request time and returns:
  - `500 { "error": "Invalid server configuration", "code": "VINE_SIGNATURE_MODE_INVALID" }`
  - `403 { "error": "Invalid signature", "code": "VINE_SIGNATURE_INVALID" }`
- All Vine failure responses are returned with `Cache-Control: no-store`.

## Future/Target behavior (explicitly speculative)
- Add nonce cleanup, device lifecycle hardening, and broader operational tooling around Vine device management.

## Related docs
- `docs/cherry-vine.md`
- `docs/api.md`
- `docs/cherry-vision.md`
- `AGENTS.md`
