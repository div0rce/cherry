Status: Active
Last updated: 2025-11-30

# Cherry Wallet Pass (Apple Wallet)

Refer to `docs/legal-constraints.md` for hard guardrails. The pass is loyalty/advisory only—never a payment instrument.

## Status and Positioning
- **Feature type:** Non-payment `storeCard` loyalty trigger (not a payment card, not a proxy BIN).
- **Current state:** Scaffolded only. `/api/wallet/cherry-pass` returns **501 Not Implemented** unless an explicit feature flag is enabled **and** all Apple Wallet env vars are present. By default, no filesystem or cert access occurs.
- **Role:** Triggers the “Manual Lookup & Rewards” flow; never fronts transactions or touches payment rails.

## Runtime Behavior (`GET /api/wallet/cherry-pass`)
- Requires authenticated user.
- Gating:
  - Feature flag: `CHERRY_WALLET_PASS_ENABLED` must equal `true`.
  - Required env vars:
    ```env
    APPLE_WALLET_TEAM_ID=...
    APPLE_WALLET_PASS_TYPE_ID=pass.com.cherry.pass
    APPLE_WALLET_ORG_NAME=Cherry
    APPLE_WALLET_PASS_DESCRIPTION=Cherry Spending Copilot Pass
    APPLE_WALLET_CERT_PASSWORD=...
    APPLE_WALLET_CERT_PATH=./certs/pass-cert.p12
    APPLE_WALLET_WWDR_CERT_PATH=./certs/apple-wwdr.pem
    ```
  - If the flag is off or env is incomplete, the route returns `501` with JSON:
    ```json
    { "error": "wallet_pass_not_configured", "reason": "wallet_pass_disabled" | "missing_env" }
    ```
- Only when the flag is **true** and env is complete does it call `lib/wallet/cherryPass.ts` to generate a `.pkpass`.

## Files and Code Hooks
- API handler: `app/api/wallet/cherry-pass/route.ts` (gated).
- Config helper: `lib/wallet/config.ts` (feature flag + env validation).
- Pass builder: `lib/wallet/cherryPass.ts` (reads certs; only invoked when gated OK).
- Local-only certs (never committed):
  - `certs/pass-cert.p12`
  - `certs/apple-wwdr.pem`
- `.gitignore` should exclude `certs/`, `*.p12`, `*.pem`, `*.pkpass`.

## Product Identity Guardrails
- Pass type: `storeCard`, never `payment`.
- Purpose: visual brand + trigger into advisory flow, not a funding instrument.
- Copy: avoid “pay with Cherry”; emphasize “Scan Cherry before you pay.”

## Future (after certs exist)
- Keep the gating; enable with `CHERRY_WALLET_PASS_ENABLED=true` and full env.
- Pass payload: user name, Cherry Points snapshot (placeholder), tagline “Scan Cherry before you pay,” QR/URL into the session flow.
- Consider adding deep link/App Clip URL when infrastructure is available.
