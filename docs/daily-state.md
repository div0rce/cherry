Status: Phase 3 complete — nightly fanout live, advisory-only
Last updated: 2025-12-06

# Completion Notes
- Clock + memory live
- Real computation wired
- Type-closed API boundaries

# DailyState & Cron Contract

Purpose: Give Cherry a clock, memory, and a single, UI-agnostic truth object that summarizes spend safety per user per day. DailyState is descriptive only; it never authorizes, fronts, or mutates spend.

Aligns with: `docs/legal-constraints.md` (advisory-only), `docs/cherry-vision.md` (copilot, not a card), and the engine/bucket invariants in `lib/engine` and `lib/buckets-runtime.ts`.

---

## Scope
- Headless kernel only. No UI surfaces or alerts in this spec.
- Reads buckets, cards, sessions, ledger, and ingest signals; writes only the DailyState table.
- Out of scope: wallet pass, Vine hardware changes, new payment rails, or any card authorization behavior.

---

## Trigger Contract (Time)
- Schedule: run once per user per UTC day (default at 00:15 UTC). Allow manual backfill via `POST /api/internal/run-daily` gated by `CHERRY_DAILYSTATE_CRON_ENABLED=true` and auth.
- Idempotency: `(userId, date)` is unique. Recomputes for the same day overwrite the row only on success.
- Batch: cron/worker pages through users to avoid timeouts; manual route accepts optional `{ userId?, date? }`.
- Fanout: internal nightly orchestrator (`POST /api/internal/run-daily-all`) pages through users in batches; errors are isolated per user.

---

## Data Model (Memory)
- `id` (cuid)
- `userId` (FK User)
- `date` (UTC date, unique with user)
- `status` enum: `SAFE | TIGHT | RISKY | INSUFFICIENT_DATA`
- `safeToSpendCents` (int, nullable when insufficient)
- `nextRiskEvent` (json/text; reason + eta; nullable)
- `summary` (json, small): `{ buckets: { remainingCents, exhaustedCategories: string[] }, pointsPending, sessionsPendingVerification }`
- `computedAt` (timestamp)
- `source` enum: `nightly | manual`
- `engineVersion` (string/hash)
- `inputsVersion` (hash of buckets/cards/objective weights snapshot)
- `errors` (text, nullable)
- Indexes: `(userId, date)` unique; `(userId, computedAt)` for latest fetch.

---

## Computation Semantics (Meaning)
- Inputs: fresh buckets via `ensureBucketFresh`/`toBucketRuntime`, cards + reward rules, objective weights, recent sessions/ledger (last 7–30 days), bank ingest rows if present, merchant observations. Time is captured at start of run.
- Status mapping:
  - `SAFE`: essentials not exhausted; aggregate remaining above buffer; no blocking anomalies.
  - `TIGHT`: at least one essential bucket at/under buffer.
  - `RISKY`: multiple essentials exhausted or outstanding anomalies (e.g., aged pending verification).
  - `INSUFFICIENT_DATA`: no buckets/cards or engine failure.
- `safeToSpendCents`: min remaining across tracked buckets (essentials-weighted), clamped ≥ 0.
- `nextRiskEvent`: earliest expiry/reset or anomaly deadline (e.g., pending verification older than 24h).
- Read-only: no bucket/ledger/session mutation; no incentives; no auth decisions.

---

## Monotonicity (Stability Guardrail)
- Soft rule: A recompute that worsens status within the same day (e.g., SAFE → RISKY) must be justified by new external data (bank ingest, session verification, fresh anomalies) or resolution of a missing dependency. Absent such changes, recomputes should not degrade status to avoid flapping.

---

## Blind Spots (Explicitly Tolerated)
- Real-time card authorizations and delayed captures.
- Offline transactions or POS context not provided to Cherry.
- Merchant-initiated adjustments outside ingest scope.
- DailyState is best-effort safety, not real-time balance truth.

---

## Semantic Stability (Versioning)
- Changes that alter the meaning or thresholds of `SAFE | TIGHT | RISKY` must bump `engineVersion` and keep existing DailyState rows intact unless an explicit migration is run.
- `inputsVersion` captures the hashed inputs used for the run; consumers must not assume cross-version equivalence without checking `engineVersion`.

---

## Failure Handling
- Per-user failure writes `status=INSUFFICIENT_DATA` with `errors` populated; no partial writes elsewhere.
- Engine or data errors log with structured context; retries happen on next scheduled run or manual trigger.
- No mutations to buckets/ledger/sessions on failure paths.

---

## Observability
- Metrics: `daily_state_runs_total{status=ok|fail}`, `daily_state_duration_ms`, `daily_state_status_breakdown{status}`.
- Logs: structured per user with `engineVersion`, `inputsVersion`, anomaly counts, and failure reasons.
- Alerts: only on systemic failure rate thresholds; no user-facing alerts in this spec.

---

## Out of Scope (Explicit)
- UI/notification wiring.
- Bucket or ledger mutation beyond `ensureBucketFresh` reads.
- New verification sources or Vine/device changes.
- Wallet pass behavior (remains 501 until enabled per `docs/wallet-pass.md`).
