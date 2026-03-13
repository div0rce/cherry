Status: Draft
Last updated: 2026-01-03

# Offline evaluator (historical replay)

## Current behavior (enforced / in code)
- Offline evaluator replays historical `BankTransaction` rows through the engine and stores `HistoricalEngineEvaluation`.
- Writes are limited to offline tables; no Sessions, Ledger, or Buckets are touched.
- Offline evaluator results are not consumed by any user-facing or authority surfaces.

## What it is
- Read-only replay of historical bank transactions through the Cherry engine against a tracked synthetic dev fixture.
- Inputs: `BankTransaction` rows (today from `csv_dev` synthetic ingest; later from Plaid/Teller).
- Outputs: `HistoricalEngineEvaluation` rows storing the engine’s best decision and scores per transaction.
- No Sessions, no Ledger, no Buckets are touched.

## Data flow
1) Ingest historical data: `npm run dev:ingest:moustafa-bank` → `BankTransaction` (`source="csv_dev"`).  
2) Evaluate offline: `npm run dev:evaluator:moustafa` → `HistoricalEngineEvaluation` via `lib/evaluator/offline-history.ts`.  
3) Inspect: `/dev/evaluator` (dev-only) + `/dev/bank` + `/history` + `/dev/statements`.

Schema: `HistoricalEngineEvaluation` (`runId`, `bankTransactionId` unique; stores decisionType, cardId, bucketId, rawDecision, scores, createdAt).

### Income regimes & buckets (offline-only)
- `lib/income/classifier.ts` classifies income/P2P (payroll, allowance, refunds, internal transfers, pseudo-merchant Zelle/Venmo).  
- `lib/income/monthly.ts` builds monthly income snapshots and segments regimes when rolling median income shifts.  
- `lib/buckets/regimes.ts` synthesizes regime-specific bucket templates (essentials/discretionary/savings + fixed obligations) and caps totals to ≤1.2× income.  
- `scripts/run-offline-evaluator-moustafa.mts` now rebuilds regimes/templates before replaying history and records `regimeId`, `bucketKey`, and bucket usage (before/after, bps) on each `HistoricalEngineEvaluation`.

## Guardrails
- Evaluator uses `evaluateTransactionOffline` (engine only) and **never** creates Sessions, Ledger rows, or mutates Buckets.
- Skips non-spend and tiny transactions (< $1) and marks them `NO_DECISION_SKIPPED`.
- Runs in dev context; production callers should 404/disable dev pages.
- Writes only to `HistoricalEngineEvaluation`, `HistoricalIncomeRegime`, and `HistoricalBucketTemplate`; does not touch `RecommendationSession` or `CherryPointLedger`.
- `/dev/evaluator` stays read-only. If no regimes/templates exist, it shows instructions instead of auto-running the builder.
- Regime/bucket synthesis is dev-only (`NODE_ENV !== production`) and scoped to `source="csv_dev"` data.
- Prisma readiness is enforced via `assertOfflineEvaluatorModelsReady()`; if the Prisma client is stale or migrations are missing, the page throws a clear error with steps (`npx prisma migrate deploy && npx prisma generate` then restart dev server). The page is additionally gated by `CHERRY_OFFLINE_EVALUATOR_ENABLED` (default `true`; set to `false` to disable without touching Prisma).

## Income regimes and P2P interpretation
- Income kinds: PAYROLL, ALLOWANCE, SIDE_GIG, REFUND, INTERNAL_TRANSFER, OTHER.
- P2P kinds: P2P_ALLOWANCE, P2P_REPAYMENT_IN/OUT, P2P_PSEUDO_MERCHANT_IN/OUT.
- Rolling median income shifts (>~35%) create new regimes (min 2 months per regime). Fixed costs are inferred from recurring debits and capped at 90% of income; free cash = income − fixed.
- Bucket templates per regime split free cash into essentials, discretionary, and savings bands with guardrails and minimum floors; fixed obligations sit in their own bucket.

## How to run
```bash
npm run dev:ingest:moustafa-bank          # load tracked synthetic CSV → BankTransaction
npm run dev:evaluator:moustafa            # offline engine replay → HistoricalEngineEvaluation
npm run dev                               # then open /dev/evaluator (and /dev/bank, /history, /dev/statements)
```

Env controls:
- `BANK_INGEST_USER_EMAIL` / `BANK_INGEST_USER_ID` — pick the target user (same as ingest script).
- `EVALUATOR_RUN_ID` — override run id; default is `defaultRunIdForUser(userId, now)`.

## Future/Target behavior (explicitly speculative)
- Swap `csv_dev` source for Plaid/Teller once live.
- Smarter categorization (MCC → RewardCategory) before calling the engine.
- Deeper metrics: bucket breach detection, actual card used vs. recommended, paycheck proximity.
- Batch/cron to refresh evaluations nightly with new data.
- Per-regime UI summaries in `/dev/evaluator` and a toggle to compare regimes side-by-side.

## What to do next (high-level)
1) Offline evaluator: for each historical transaction, run the engine as if scanned pre-swipe; store the decision + scores; browse in `/dev/evaluator`.
2) Metrics: measure how often Cherry would have blocked risky/budget-breaking spends, recommended a different card/bucket, or warned on high-pain transactions. This is the first “is Cherry worth it?” dataset before live bank links.
3) Regime-aware insights: stress and soft-intervention rates are now computed against synthesized, per-regime bucket templates to avoid flat 0%/100% artifacts.

## Dependency on ingest invariants
- BankTransaction rows must remain unique on `(userId, externalId)`; ingest must never set the primary `id`.
- Re-running ingest should update, not duplicate; unstable `externalId` values will corrupt evaluator metrics.

### Writer/Reader contract
- Evaluator scripts must target the same users that own ingested transactions (csv_dev/Plaid/Teller) and use a stable `runId` such as `defaultRunIdForUser(userId, now)`, where `now` is explicitly passed from the caller.
- `/dev/evaluator` derives `userId` from the signed-in user and defaults `runId` to `defaultRunIdForUser(userId, now)`, falling back to the latest run if empty (callers must provide a deterministic `now`).
- If you point evaluator scripts at a different user (via env/CLI), also sign in as that user to view results.

### Debugging an empty /dev/evaluator
- Check counts: `BankTransaction` with `source="csv_dev"` for the logged-in user vs. `HistoricalEngineEvaluation` rows for the same user.
- Ensure ingest (`npm run dev:ingest:moustafa-bank`) and evaluator (`npm run dev:evaluator:moustafa`) both use the same `BANK_INGEST_USER_*` identity.
- Use the debug footer on `/dev/evaluator` to see userId, counts, and latest runId.

### Hydration/SSR rules for dev console
- Keep outer wrappers stable between empty/data states; only change inner content (e.g., swap empty copy vs. table rows).
- Avoid non-deterministic JSX in server components (`Date.now()`, `Math.random()`, `typeof window` checks). Compute values on the server before render.
- Fetch evaluator data once on the server for initial render; client refetches should not change structural markup.

## Related docs
- `docs/income-regimes.md`
- `docs/bank-ingest-notes.md`
- `docs/legal-constraints.md`
- `docs/data-policy.md`
