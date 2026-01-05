Status: Active
Last updated: 2026-01-03

# DailyState & Cron Contract

Purpose: Give Cherry a clock, memory, and a single, UI-agnostic truth object that summarizes spend safety per user per day. DailyState is descriptive only; it never authorizes, fronts, or mutates spend.

Aligns with: `docs/legal-constraints.md` (advisory-only), `docs/cherry-vision.md` (copilot, not a card), and the engine/bucket invariants in `lib/engine` and `lib/buckets-runtime.ts`.

---

## Current behavior (enforced / in code)
- Manual and batch endpoints exist: `POST /api/internal/run-daily` and `POST /api/internal/run-daily-all`.
- Both endpoints are gated by `CHERRY_DAILYSTATE_CRON_ENABLED=true` and require auth.
- Scheduling is external to the repo; no cron runner is bundled here.
- DailyState is advisory-only and does not mutate buckets, sessions, or ledger.

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
### Time invariants
- A single `now` timestamp is captured at the start of each run.
- All bucket freshness, period checks, and anomaly aging are evaluated against this timestamp.
- No additional wall-clock reads are permitted during computation.
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

## Relationship to Authority
- DailyState is an **input signal** to `authority_v1`; it does not emit user-facing guidance.
- All advisories/warnings shown to users must flow through `simulateSpendAuthority` and the authority contract.
- DailyState status (SAFE/TIGHT/RISKY) informs authority severity but is not itself a verdict or enforcement surface.

---

## Failure Handling
- Per-user failure writes `status=INSUFFICIENT_DATA` with `errors` populated; no partial writes elsewhere.
- Engine or data errors log with structured context; retries happen on next scheduled run or manual trigger.
- No mutations to buckets/ledger/sessions on failure paths.
### Write atomicity
- DailyState rows are written atomically.
- On failure, existing rows for `(userId, date)` are preserved unchanged.
- No partial or degraded writes replace a successful prior computation.

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

## Future/Target behavior (explicitly speculative)
- Add a production scheduler or job runner that triggers `run-daily-all` nightly.
- Expand DailyState inputs once real bank ingest is available.

## Related docs
- `docs/authority-v1.md`
- `docs/legal-constraints.md`
- `docs/api.md`
