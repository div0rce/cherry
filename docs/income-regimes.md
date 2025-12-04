Status: Draft
Last updated: 2025-12-04

# Income regimes and bucket synthesis (offline evaluator)

## What this covers
- Income/P2P classification heuristics for CSV dev data.
- Monthly income snapshots → regime segmentation (rolling median shifts).
- Regime-specific bucket template synthesis for offline evaluator metrics.
- Guardrails: dev-only, diagnostic, no writes to live Buckets/Sessions/Ledger.

## Classification
- Income kinds: PAYROLL, ALLOWANCE, SIDE_GIG, REFUND, INTERNAL_TRANSFER, OTHER, NONE.
- P2P kinds: P2P_ALLOWANCE, P2P_REPAYMENT_IN/OUT, P2P_PSEUDO_MERCHANT_IN/OUT, NONE.
- Heuristics: keyword + cadence based (weekly Zelle allowance, monthly pseudo-merchant barbers, repayment memos). Refunds and reimbursements are treated as negative spend for bucket stress.
- Dev-only persistence: `classifyIncomeAndP2PForUser(userId, { persist: true, sourceFilter: ['csv_dev'] })` writes `incomeKind`/`p2pKind` on `BankTransaction`. Production blocks persistence.

## Regime detection
- Built from monthly net earned income (`payroll + allowance + side gig + P2P_ALLOWANCE`).
- Uses 3-month rolling median; regime changes when median shifts by ~35% and span ≥2 months.
- Fixed costs inferred from recurring debits (monthly/weekly cadence) and capped at 90% of income. Free cash = income − fixed (can be negative for underwater regimes).
- Stored in `HistoricalIncomeRegime` with inclusive month range and averages.

## Bucket synthesis (regime-specific)
- Synthesizes buckets: fixed_obligations, essentials_groceries, essentials_transport, essentials_personal_care, discretionary_social, discretionary_shopping, savings_buffer.
- Splits free cash into bands (essentials 40–60%, discretionary 20–40%, savings remainder) with floors and caps total limits at ≤1.2× income. Fixed obligations use inferred recurring amount.
- `HistoricalBucketTemplate` stores monthly limits, avg spend, and target share bps; rebuilt per user per evaluator run.

## Offline evaluator integration
- `scripts/run-offline-evaluator-moustafa.ts` now: classify income/P2P → rebuild regimes/templates → replay transactions.
- `HistoricalEngineEvaluation` rows store `regimeId`, `bucketKey`, and bucket usage before/after (bps). Stats are computed on regime-aware buckets, not flat heuristics.
- `/dev/evaluator` is read-only and shows instructions when regimes/templates are missing; no writes on page render.

## Guardrails
- Dev-only: gated by `NODE_ENV !== 'production'` in classification persistence and regime/template writes.
- Diagnostic only: do not use regime/bucket inference for credit or live engine decisions without legal review.
- No live writes: Buckets, CherryPointLedger, RecommendationSession stay untouched; only offline tables mutate.
- Be conservative with P2P: when ambiguous, treat as repayment/social spend, not income.
