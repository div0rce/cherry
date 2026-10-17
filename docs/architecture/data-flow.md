Status: Active
Last updated: 2026-09-22

# Data Flow

Traces of the main operations through the layers, as implemented. Paths are exact; read the named file for detail.

## Common boundary pattern (every API route)
1. `resolveUserContext({ getSession: auth, requireAuth, allowLabDemo })` from `lib/user-context.ts` yields `userId` (or 401). Nine routes use the `withUser` wrapper in `lib/with-user.ts` instead; both end in `resolveUserContext`.
2. `parseJsonBody(request, Schema)` from `lib/validation.ts` with a Zod schema from `lib/schemas/*`; returns a ready 400 response on failure.
3. `const now = new Date(); const nowMs = now.getTime()` and `const world = buildPrismaWorld()` (`lib/adapters/runtime/world.prisma.ts`). Time and side effects enter here and are passed down.
4. One service call. Response via `NextResponse.json`.

## Scan (advisory, stateless) — `POST /api/scan`
`app/api/scan/route.ts`
- `resolveScanCategory` (`lib/scan-helpers.ts`) maps merchant/MCC/explicit category to a `RewardCategory`.
- `simulateSpendAuthority` (`lib/adapters/runtime/authority.prisma.ts` -> pure `lib/authority/simulateSpendAuthority.ts`) decides admissibility.
- `fromPrismaUserToEngineState` (`lib/adapters/runtime/engine-state.prisma.ts`) loads cards/buckets into `EngineState`.
- `safeSolveDecisionForWorld(world, userId, context, { stateOverride, legacyDecisionProvider: runLegacyEngine })` (`lib/engine/run.ts`): `fromLegacy` -> `validateEngineInput` -> `solveDecision`; returns `{ ok:false, reason }` instead of throwing. The legacy engine decision rides along for the response shape.
- `recordDecisionEvent` writes a `DecisionEvent` row (telemetry). No session, no ledger, no bucket mutation.

## Recommendation session lifecycle
**Create — `POST /api/sessions`** (`app/api/sessions/route.ts`): same auth/parse/engine steps as scan, then `prisma.recommendationSession.create` with `orderToken`, `expiresAt`, offered points, verdicts, `source: APP_SCAN`.

**Confirm — `POST /api/sessions/[id]/confirm`** -> `confirmRecommendationSession` in `lib/sessions/confirm-service.ts`:
- rejects expired or already-confirmed sessions (`SessionConfirmError`);
- computes an anomaly code (amount mismatch, time window, card mismatch);
- `ensureBucketFresh(bucketId, now)` (`lib/buckets/ensure-fresh.ts`) rolls the period if needed, then increments `Bucket.spentCents` exactly once;
- writes `CherryPointLedger` rows with status `PENDING`, `verificationStatus: PENDING`.

**Verify — `POST /api/sessions/[id]/verify`** -> `verifySessionFromSignal` in `lib/verification/verify-session.ts`: flips ledger rows to `POSTED` or `REVOKED`; revocation reverses the bucket spend via `lib/sessions/reversal.ts`. Verification signals are simulated today (`lib/verification/{bank,receipts,vine}.ts` are stubs).

## Vine order (dev-only context beacon) — `POST /api/vine/order`
`app/api/vine/order/route.ts`
- Accepts a terminal event (`vineTerminalEventSchema`) or an `OrderContext` (`OrderContextSchema`); `mapTerminalEventToOrderContext` normalises.
- `verifyVineSignature` (`lib/vine/security.ts`) under `CHERRY_VINE_SIGNATURE_MODE` (`off | warn | enforce`; production requires `enforce`, asserted by `lib/config/server.ts`).
- Freshness window of 3 minutes on the order timestamp.
- `runRecommendationFromOrderContext(world, orderContext, userId, ...)` (`lib/vine/run-recommendation.ts`) runs the engine and creates a session with `source: VINE_*` and an `orderToken`.

## Autopilot — `POST /api/autopilot/preview`, `POST /api/autopilot/commit`
- `getAutopilotPreview` (`lib/autopilot/service.ts`) builds the engine context for a proposed swipe and returns the ranked decision without persisting.
- `commitAutopilotDecision` / `commitAutopilotDecisionV2` (flag `AUTOPILOT_COMMIT_V2`) persist an `AutopilotCommit` keyed by an idempotency key (`lib/autopilot/engineDecisionId.ts`, `lib/idempotency.ts`) and apply bucket impact through the same bucket runtime.
- Input validation lives in `lib/validation/autopilot/*` and `lib/autopilot/types.ts`.

## Bank ingest (dev-only) — `POST /api/dev/bank/ingest`, `npm run ingest:moustafa-bank`
- CSV rows -> `lib/bank/csv-dev-provider.ts` -> `upsertBankTransactions` (`lib/bank/ingest.ts`), idempotent on `(userId, externalId)`; `BankTransaction.id` is never taken from input.
- `lib/income/classifier.ts` derives income/P2P kinds; `lib/buckets/regimes.ts` derives regimes.

## Offline evaluator (diagnostic only) — `npm run audit:evaluator:moustafa`
`lib/evaluator/offline-history.ts` replays `BankTransaction` rows through `safeSolveDecisionForUser` and writes only `HistoricalEngineEvaluation`. Gated by `CHERRY_OFFLINE_EVALUATOR_ENABLED`; must call `assertOfflineEvaluatorModelsReady()` first.

## Wallet pass — `GET /api/wallet/cherry-pass`
Returns 501 unless `CHERRY_WALLET_PASS_ENABLED=true` and all Apple env vars are set (`lib/wallet/config.ts`); otherwise builds a static `storeCard` pass (`lib/wallet/cherryPass.ts`) showing the posted Cherry Points balance (`lib/points.ts`). No pass-update web service, so no `webServiceURL`. Never a payment instrument.

## Related docs
- `docs/api.md` (request/response shapes), `docs/verification-flow.md`, `docs/cherry-vine.md`, `docs/autopilot-master-spec.md`, `docs/offline-evaluator.md`
