Status: Active
Last updated: 2026-01-03

# Cherry Legal & Identity Constraints

This document consolidates the non-negotiable legal and product identity boundaries for Cherry, Cherry Vine, and the Cherry Wallet Pass. It governs every code path and doc.

If any behavior or copy conflicts with this file, fix the code/docs to comply—do not weaken these rules.

## Purpose
- Provide a single place to confirm what Cherry, Vine, and the Wallet Pass may and may not do.
- Keep Cherry firmly out of payment rails, issuing, and money movement.
- Give developers a checklist before shipping features that touch merchants, cards, or wallet surfaces.

## Current behavior (enforced / in code)
- Cherry is an advisory system: observe → evaluate → recommend → reward. It never authorizes, routes, or settles payments.
- Cherry Vine is a context beacon only; it never accepts taps/swipes/PINs or connects to payment networks.
- The Wallet pass is a storeCard-style advisory scaffold and stays gated at 501 until certs and the feature flag exist.
- Key payment-rail wording is guarded by CI checks where implemented.

## Interpretation rule
- In case of conflict, this document overrides all other product, UI, and engine docs.
- Ambiguous features must be scoped conservatively toward advisory-only behavior.

## Cherry Is Not (Forbidden Behaviors)
- Not a credit card, debit card, prepaid card, or “smart fronting” card.
- Not a proxy BIN, program manager, processor, issuer, gateway, or money transmitter.
- Does **not** route, authorize, or intermediate payments; never sits in front of real cards.
- Does **not** store or process PCI cardholder data (PAN, CVV, track data, EMV blobs, PIN).
- Does **not** speak EMV, ISO8583, or any network authorization protocol.
- Does **not** hold funds, escrow money, or affect settlement in any way.

## Cherry Vine Is Not
- Not a payment terminal, reader, or tap/swipe/PIN device.
- Does **not** accept cardholder input of any kind.
- Does **not** connect to card networks, processors, acquirers, or issuer hosts.
- Does **not** emit or consume EMV/ISO8583 or POS payment protocols.
- Is strictly a **context beacon**: merchant/store IDs, amount, timestamp, and optional order metadata only.

## Cherry Wallet Pass Constraints
- Pass type must remain `storeCard`-style loyalty/advisory; **never** a payment pass.
- Must not present UI that implies “pay with Cherry” or that Cherry fronts transactions.
- Endpoint `GET /api/wallet/cherry-pass` stays gated (501) unless `CHERRY_WALLET_PASS_ENABLED=true` **and** all Apple Wallet env vars/certs exist.

## Data Boundaries
- Allowed data: merchant/store identifiers, order totals, timestamps, MCC/category, anonymized analytics, card metadata such as nickname/issuer/network/last4, Cherry Points balances, advisory session tokens.
- Forbidden data: PAN, CVV, track data, PINs, issuer credentials, raw network payloads, cryptograms, host responses, and any personally identifiable cardholder data beyond permitted metadata.

## Developer Rules
- Any feature near payments must be checked against this doc before shipping.
- Any design that resembles fronting/issuing/routing must be rejected or clearly scoped as “future regulated product, not Cherry.”
- Keep advisory boundaries intact: observe → evaluate → recommend → reward. No authorization or money movement.
- Cross-reference `docs/cherry-vision.md`, `docs/cherry-vine.md`, and `docs/wallet-pass.md` whenever modifying engine, Vine ingest, or Wallet surfaces.

## Future/Target behavior (explicitly speculative)
- Any expansion toward regulated payment functionality is out of scope for Cherry and would require new legal documentation and a product fork.

## Related docs
- `docs/cherry-vision.md`
- `docs/cherry-vine.md`
- `docs/wallet-pass.md`
- `docs/ci-and-guardrails.md`
