# Cherry Wallet Pass (Apple Wallet)

Cherry provides a non-payment Apple Wallet pass (Cherry Pass) that behaves like a loyalty/rewards card and can be used to trigger the “scan before you pay” flow.

## How it works
- Endpoint: `GET /api/wallet/cherry-pass`
- Requires the user to be authenticated.
- Generates a `.pkpass` file representing a Cherry storeCard pass (not a payment card).
- Displays: user name, Cherry Points (placeholder), and tagline “Scan Cherry before you pay.”

## Files
- `lib/wallet/cherryPass.ts` — pass generation logic
- `app/api/wallet/cherry-pass/route.ts` — API route that returns the `.pkpass`
- `certs/pass-cert.p12` — Pass Type ID certificate (local only, not committed)
- `certs/apple-wwdr.pem` — Apple WWDR certificate (local only, not committed)

## Environment
Set in `.env.local` (not committed):
```env
APPLE_WALLET_TEAM_ID=...
APPLE_WALLET_PASS_TYPE_ID=pass.com.cherry.pass
APPLE_WALLET_ORG_NAME=Cherry
APPLE_WALLET_PASS_DESCRIPTION=Cherry Spending Copilot Pass
APPLE_WALLET_CERT_PASSWORD=...
APPLE_WALLET_CERT_PATH=./certs/pass-cert.p12
APPLE_WALLET_WWDR_CERT_PATH=./certs/apple-wwdr.pem
```

## Generating a pass
1) Start dev server:
```bash
npm run dev
```
2) Ensure you are logged in.
3) Visit in the browser:
```
http://localhost:3000/api/wallet/cherry-pass
```
4) A file `cherry.pkpass` downloads. Open it on an iPhone to add to Wallet.

## Notes
- Pass type is `storeCard` to clearly separate from payment rails.
- Certificates and `.pkpass` files are ignored in Git (`certs/`, `*.p12`, `*.pem`, `*.pkpass`).
- Barcode points to a Cherry deep link stub for future App Clip/App routing.
