import * as assert from 'node:assert/strict';
import {
  available,
  createLoadedEngineCapabilities,
  unavailable,
  type EngineState,
  type ScheduledPaydown,
} from '../../lib/engine.js';
import { evaluateScheduledPaydowns } from '../../lib/engine/scheduled-paydowns.js';
import { buildTemporalResponseShape } from '../../lib/engine/temporal-response.js';

const nowMs = new Date('2024-01-01T00:00:00Z').getTime();
const DIAGNOSTIC_CODE = 'SCHEDULED_PAYDOWN_MISSING_DEBT_ID';

function buildState(
  scheduledPaydowns: EngineState['scheduledPaydowns'],
  debts: EngineState['debts'] = available([
    {
      id: 'debt-1',
      name: 'Debt',
      type: 'CREDIT_CARD',
      balanceCents: 5_000,
      creditLimitCents: 10_000,
      aprPercent: 18,
      minPaymentCents: 100,
      dueDayOfMonth: 1,
    },
  ]),
  overrides: Partial<EngineState> = {}
): EngineState {
  return {
    userId: 'user-1',
    cards: [],
    buckets: [],
    debts,
    scheduledPaydowns,
    constraints: { hard: {}, soft: {} },
    world: { baseInterestRate: null, inflationEstimate: null },
    cash: unavailable(),
    capabilities: createLoadedEngineCapabilities(),
    preferences: { profileId: 'BALANCED' },
    ...overrides,
  };
}

function scheduledPaydown(overrides: Partial<ScheduledPaydown> = {}): ScheduledPaydown {
  return {
    id: 'sp-1',
    debtId: 'debt-1',
    amountCents: 1_500,
    effectiveAtMs: nowMs + 60_000,
    status: 'SCHEDULED',
    source: 'AUTOPAY',
    ...overrides,
  };
}

function assertTemporalResponseHasNoDiagnosticLeak(value: unknown): void {
  assert.equal(JSON.stringify(value).includes(DIAGNOSTIC_CODE), false);
}

function run(): void {
  const unavailableEvaluation = evaluateScheduledPaydowns(buildState(unavailable()), nowMs);
  const unavailableShape = buildTemporalResponseShape(unavailableEvaluation, nowMs);
  assertTemporalResponseHasNoDiagnosticLeak(unavailableShape);
  assert.equal(unavailableEvaluation.sourceStatus, 'UNAVAILABLE');
  assert.equal(unavailableEvaluation.presentEffective.length, 0);
  assert.equal(unavailableEvaluation.futureEligible.length, 0);
  assert.equal(unavailableShape.temporalContext.scheduledPaydownSourceStatus, 'UNAVAILABLE');
  assert.equal(unavailableShape.temporalContext.modelMode, 'PRESENT_ONLY');
  assert.equal(unavailableShape.contingentRecommendation, null);

  const emptyEvaluation = evaluateScheduledPaydowns(buildState(available([])), nowMs);
  const emptyShape = buildTemporalResponseShape(emptyEvaluation, nowMs);
  assertTemporalResponseHasNoDiagnosticLeak(emptyShape);
  assert.equal(emptyEvaluation.sourceStatus, 'AVAILABLE_EMPTY');
  assert.equal(emptyShape.temporalContext.scheduledPaydownSourceStatus, 'AVAILABLE_EMPTY');
  assert.equal(emptyShape.temporalContext.includesScheduledPaydowns, false);

  const cancelledOnlyEvaluation = evaluateScheduledPaydowns(
    buildState(available([scheduledPaydown({ status: 'CANCELLED' })])),
    nowMs
  );
  assert.equal(cancelledOnlyEvaluation.sourceStatus, 'AVAILABLE_NO_ACTIVE');
  assert.equal(cancelledOnlyEvaluation.presentEffective.length, 0);
  assert.equal(cancelledOnlyEvaluation.futureEligible.length, 0);
  assert.deepEqual(cancelledOnlyEvaluation.diagnostics, []);

  const alreadyEffectiveOnlyEvaluation = evaluateScheduledPaydowns(
    buildState(available([scheduledPaydown({ effectiveAtMs: nowMs - 1 })])),
    nowMs
  );
  assert.equal(alreadyEffectiveOnlyEvaluation.sourceStatus, 'AVAILABLE_NO_ACTIVE');
  assert.equal(alreadyEffectiveOnlyEvaluation.presentEffective.length, 1);
  assert.equal(alreadyEffectiveOnlyEvaluation.futureEligible.length, 0);

  const missingDebtOnlyEvaluation = evaluateScheduledPaydowns(
    buildState(available([scheduledPaydown({ debtId: null })])),
    nowMs
  );
  assert.equal(missingDebtOnlyEvaluation.sourceStatus, 'AVAILABLE_NO_ACTIVE');
  assert.equal(missingDebtOnlyEvaluation.presentEffective.length, 0);
  assert.equal(missingDebtOnlyEvaluation.futureEligible.length, 0);
  assert.deepEqual(missingDebtOnlyEvaluation.diagnostics, [
    { code: 'SCHEDULED_PAYDOWN_MISSING_DEBT_ID', count: 1 },
  ]);

  const noActiveEvaluation = evaluateScheduledPaydowns(
    buildState(
      available([
        scheduledPaydown({ status: 'CANCELLED' }),
        scheduledPaydown({ debtId: null }),
        scheduledPaydown({ debtId: 'missing-debt' }),
        scheduledPaydown({ effectiveAtMs: nowMs }),
      ])
    ),
    nowMs
  );
  const noActiveShape = buildTemporalResponseShape(noActiveEvaluation, nowMs);
  assertTemporalResponseHasNoDiagnosticLeak(noActiveShape);
  assert.equal(noActiveShape.temporalContext.scheduledPaydownSourceStatus, 'AVAILABLE_NO_ACTIVE');
  assert.equal(noActiveShape.temporalContext.modelMode, 'PRESENT_ONLY');
  assert.equal(noActiveShape.contingentRecommendation, null);
  assert.equal(noActiveShape.futureRiskContext, null);
  assert.equal(noActiveEvaluation.presentEffective.length, 1);
  assert.equal(noActiveEvaluation.futureEligible.length, 0);
  assert.deepEqual(noActiveEvaluation.diagnostics, [
    { code: 'SCHEDULED_PAYDOWN_MISSING_DEBT_ID', count: 2 },
  ]);

  const activeEvaluation = evaluateScheduledPaydowns(
    buildState(
      available([
        scheduledPaydown(),
        scheduledPaydown({ id: 'sp-invalid', debtId: 'missing-debt' }),
        scheduledPaydown({ id: 'sp-cancelled-active', status: 'CANCELLED' }),
      ])
    ),
    nowMs
  );
  const activeShape = buildTemporalResponseShape(activeEvaluation, nowMs);
  assertTemporalResponseHasNoDiagnosticLeak(activeShape);
  assert.equal(activeShape.temporalContext.scheduledPaydownSourceStatus, 'AVAILABLE_ACTIVE');
  assert.equal(activeShape.temporalContext.includesScheduledPaydowns, true);
  assert.equal(activeShape.temporalContext.modelMode, 'PRESENT_PLUS_FUTURE_EVENTS');
  assert.equal(activeEvaluation.futureEligible.length, 1);
  assert.deepEqual(activeEvaluation.diagnostics, [
    { code: 'SCHEDULED_PAYDOWN_MISSING_DEBT_ID', count: 1 },
  ]);
  assert.ok(activeShape.contingentRecommendation);
  assert.equal(activeShape.contingentRecommendation?.action.kind, 'SCHEDULED_PAYDOWN');

  const paycheckOnlyEvaluation = evaluateScheduledPaydowns(
    buildState(available([]), available([]), {
      cash: available({
        liquidCents: 10_000,
        nextPaycheckDateMs: nowMs + 86_400_000,
        nextPaycheckNetCents: 2_500,
      }),
    }),
    nowMs
  );
  assert.equal(paycheckOnlyEvaluation.sourceStatus, 'AVAILABLE_EMPTY');
  assert.equal(paycheckOnlyEvaluation.futureEligible.length, 0);

  console.warn('node engine-scheduled-paydowns-source: ok');
}

run();
