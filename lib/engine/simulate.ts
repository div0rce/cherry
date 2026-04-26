import type {
  BucketId,
  BucketProjection,
  CashProjection,
  DebtAccount,
  DebtProjection,
  EngineAction,
  EngineActionTiming,
  EngineContext,
  EngineState,
  NormalizedCardId,
} from './types.js';
import { available, getCashState, getDebtAccounts, hasAvailableValue } from './types.js';
import {
  evaluateScheduledPaydowns,
  type EvaluatedScheduledPaydown,
  type ScheduledPaydownEvaluation,
} from './scheduled-paydowns.js';

type NormalizedSimulationAction = {
  action: EngineAction;
  timing: EngineActionTiming;
};

type SourceClassOrder = 1 | 2;

type SimulationEvent =
  | {
      kind: 'USE_CARD_PURCHASE';
      cardId: NormalizedCardId | null;
      amountCents: number;
      effectiveAtMs: number;
      sourceClassOrder: SourceClassOrder;
      sourceSequence: number;
      eventSequenceWithinAction: number;
    }
  | {
      kind: 'PAYDOWN';
      debtId: string | null;
      amountCents: number;
      effectiveAtMs: number;
      sourceClassOrder: SourceClassOrder;
      sourceSequence: number;
      eventSequenceWithinAction: number;
    };

function hasNonEmptyString(value?: string | null): value is string {
  return value !== undefined && value !== null && value !== '';
}

function hasPositiveNumber(value?: number | null): value is number {
  return value !== undefined && value !== null && !Number.isNaN(value) && value > 0;
}

function pickBucketForContext(state: EngineState, ctx: EngineContext): BucketId | null {
  if (!hasNonEmptyString(ctx.merchantCategoryKey)) return null;
  const candidate = state.buckets.find((bucket) => bucket.categoryKey === ctx.merchantCategoryKey);
  return candidate ? candidate.id : null;
}

function cloneBuckets(buckets: EngineState['buckets']): EngineState['buckets'] {
  return buckets.map((bucket) => ({ ...bucket }));
}

function cloneDebts(debts: EngineState['debts']): EngineState['debts'] {
  if (!hasAvailableValue(debts)) return debts;
  return available(debts.value.map((debt) => ({ ...debt })));
}

function recomputeBucketBalance(bucket: EngineState['buckets'][number]): void {
  const limit = bucket.limitCents == null ? 0 : bucket.limitCents;
  const posted = bucket.postedSpendCents == null ? 0 : bucket.postedSpendCents;
  const pending = bucket.pendingSpendCents == null ? 0 : bucket.pendingSpendCents;
  bucket.committedCents = posted + pending;
  bucket.remainingCents = Math.max(0, limit - bucket.committedCents);
}

function reduceProjectedLiquid(projectedLiquid: number | null, amount: number): number | null {
  if (projectedLiquid == null || !hasPositiveNumber(amount)) return projectedLiquid;
  return Math.max(0, projectedLiquid - amount);
}

function findLinkedDebt(
  debts: EngineState['debts'],
  linkedDebtId?: string | null
): DebtAccount | undefined {
  if (!hasNonEmptyString(linkedDebtId)) return undefined;
  return getDebtAccounts(debts).find((debt) => debt.id === linkedDebtId);
}

function normalizeActionTiming(action: EngineAction, decisionTimeMs: number): EngineActionTiming {
  const scheduledAt =
    action.paydownScheduledDateMs == null ? null : action.paydownScheduledDateMs;
  if (scheduledAt == null || scheduledAt <= decisionTimeMs) {
    return {
      mode: 'IMMEDIATE',
      effectiveAtMs: decisionTimeMs,
    };
  }
  return {
    mode: 'SCHEDULED',
    effectiveAtMs: scheduledAt,
  };
}

function normalizeSimulationAction(
  action: EngineAction,
  decisionTimeMs: number
): NormalizedSimulationAction {
  return {
    action,
    timing: normalizeActionTiming(action, decisionTimeMs),
  };
}

function isPresentEffective(timing: EngineActionTiming, decisionTimeMs: number): boolean {
  return timing.effectiveAtMs <= decisionTimeMs;
}

function expandScheduledPaydownEvent(
  scheduledPaydown: EvaluatedScheduledPaydown
): SimulationEvent | null {
  return {
    kind: 'PAYDOWN',
    debtId: scheduledPaydown.debtId,
    amountCents: scheduledPaydown.amountCents,
    effectiveAtMs: scheduledPaydown.effectiveAtMs,
    sourceClassOrder: 1,
    sourceSequence: scheduledPaydown.sourceOrder,
    eventSequenceWithinAction: 0,
  };
}

function expandPreExistingStateEvents(
  evaluation: ScheduledPaydownEvaluation
): SimulationEvent[] {
  return evaluation.presentEffective
    .map((scheduledPaydown) => expandScheduledPaydownEvent(scheduledPaydown))
    .filter((event): event is SimulationEvent => event !== null);
}

function expandCandidateActionEvents(
  state: EngineState,
  ctx: EngineContext,
  normalizedAction: NormalizedSimulationAction
): SimulationEvent[] {
  const { action, timing } = normalizedAction;
  const amountCents = ctx.amountCents == null ? 0 : ctx.amountCents;
  const events: SimulationEvent[] = [];

  switch (action.type) {
    case 'USE_CARD':
      if (hasPositiveNumber(amountCents) && hasNonEmptyString(action.cardId)) {
        events.push({
          kind: 'USE_CARD_PURCHASE',
          cardId: action.cardId,
          amountCents,
          effectiveAtMs: timing.effectiveAtMs,
          sourceClassOrder: 2,
          sourceSequence: 0,
          eventSequenceWithinAction: 0,
        });
      }
      break;
    case 'USE_CARD_WITH_PAYDOWN':
      if (hasPositiveNumber(amountCents) && hasNonEmptyString(action.cardId)) {
        events.push({
          kind: 'USE_CARD_PURCHASE',
          cardId: action.cardId,
          amountCents,
          effectiveAtMs: ctx.nowMs,
          sourceClassOrder: 2,
          sourceSequence: 0,
          eventSequenceWithinAction: 0,
        });
      }
      if (
        isPresentEffective(timing, ctx.nowMs) &&
        hasPositiveNumber(action.paydownAmountCents)
      ) {
        events.push({
          kind: 'PAYDOWN',
          debtId: action.debtId === undefined ? null : action.debtId,
          amountCents: action.paydownAmountCents,
          effectiveAtMs: timing.effectiveAtMs,
          sourceClassOrder: 2,
          sourceSequence: 0,
          eventSequenceWithinAction: 1,
        });
      }
      break;
    case 'PAY_DOWN_DEBT':
      if (
        isPresentEffective(timing, ctx.nowMs) &&
        hasPositiveNumber(action.paydownAmountCents)
      ) {
        events.push({
          kind: 'PAYDOWN',
          debtId: action.debtId === undefined ? null : action.debtId,
          amountCents: action.paydownAmountCents,
          effectiveAtMs: timing.effectiveAtMs,
          sourceClassOrder: 2,
          sourceSequence: 0,
          eventSequenceWithinAction: 0,
        });
      }
      break;
    case 'SWITCH_MERCHANT': {
      const syntheticCardId = pickBestCashOrDebitCard(state);
      if (hasPositiveNumber(amountCents) && hasNonEmptyString(syntheticCardId)) {
        events.push({
          kind: 'USE_CARD_PURCHASE',
          cardId: syntheticCardId,
          amountCents,
          effectiveAtMs: ctx.nowMs,
          sourceClassOrder: 2,
          sourceSequence: 0,
          eventSequenceWithinAction: 0,
        });
      }
      break;
    }
    case 'DELAY_PURCHASE':
    case 'REJECT_PURCHASE':
      break;
    default:
      break;
  }

  return events;
}

function compareSimulationEvents(a: SimulationEvent, b: SimulationEvent): number {
  if (a.effectiveAtMs !== b.effectiveAtMs) {
    return a.effectiveAtMs - b.effectiveAtMs;
  }
  if (a.sourceClassOrder !== b.sourceClassOrder) {
    return a.sourceClassOrder - b.sourceClassOrder;
  }
  if (a.sourceSequence !== b.sourceSequence) {
    return a.sourceSequence - b.sourceSequence;
  }
  return a.eventSequenceWithinAction - b.eventSequenceWithinAction;
}

function reduceSimulationEvent(params: {
  state: EngineState;
  ctx: EngineContext;
  event: SimulationEvent;
  buckets: EngineState['buckets'];
  debts: EngineState['debts'];
  projectedLiquid: number | null;
}): number | null {
  const { state, ctx, event, buckets, debts } = params;

  switch (event.kind) {
    case 'USE_CARD_PURCHASE': {
      if (!hasNonEmptyString(event.cardId) || !hasPositiveNumber(event.amountCents)) {
        return params.projectedLiquid;
      }

      const bucketId = pickBucketForContext(state, ctx);
      if (hasNonEmptyString(bucketId)) {
        const bucket = buckets.find((candidate) => candidate.id === bucketId);
        if (bucket !== undefined) {
          bucket.pendingSpendCents += event.amountCents;
          recomputeBucketBalance(bucket);
        }
      }

      const card = state.cards.find((candidate) => candidate.id === event.cardId);
      if (card === undefined) return params.projectedLiquid;

      if (card.isCredit === true) {
        const linkedDebt = findLinkedDebt(debts, card.linkedDebtId);
        if (linkedDebt !== undefined) {
          linkedDebt.balanceCents += event.amountCents;
        }
        return params.projectedLiquid;
      }

      return reduceProjectedLiquid(params.projectedLiquid, event.amountCents);
    }
    case 'PAYDOWN': {
      if (!hasNonEmptyString(event.debtId) || !hasPositiveNumber(event.amountCents)) {
        return params.projectedLiquid;
      }
      const debt = getDebtAccounts(debts).find((candidate) => candidate.id === event.debtId);
      if (debt === undefined) return params.projectedLiquid;
      const delta = Math.min(debt.balanceCents, event.amountCents);
      debt.balanceCents -= delta;
      return reduceProjectedLiquid(params.projectedLiquid, delta);
    }
    default:
      return params.projectedLiquid;
  }
}

function pickBestCashOrDebitCard(state: EngineState): NormalizedCardId | undefined {
  const debit = state.cards.find((card) => card.isActive && !card.isCredit);
  if (debit !== undefined) return debit.id;
  return state.cards.find((card) => card.isActive)?.id;
}

/**
 * The live engine evaluates a single present-time step. Only actions effective
 * at or before `ctx.nowMs` mutate simulated state for present ranking.
 */
export function simulateAction(
  state: EngineState,
  ctx: EngineContext,
  action: EngineAction,
  options: { scheduledPaydownEvaluation?: ScheduledPaydownEvaluation } = {}
): {
  buckets: BucketProjection[];
  debt: DebtProjection[];
  cash: CashProjection;
} {
  const clonedBuckets = cloneBuckets(state.buckets);
  clonedBuckets.forEach(recomputeBucketBalance);
  const clonedDebts = cloneDebts(state.debts);
  const cashState = getCashState(state.cash);
  let projectedLiquid =
    cashState != null && cashState.liquidCents != null ? cashState.liquidCents : null;

  const normalizedAction = normalizeSimulationAction(action, ctx.nowMs);
  const scheduledPaydownEvaluation =
    options.scheduledPaydownEvaluation === undefined
      ? evaluateScheduledPaydowns(state, ctx.nowMs)
      : options.scheduledPaydownEvaluation;
  const preExistingStateEvents = expandPreExistingStateEvents(scheduledPaydownEvaluation);
  const candidateActionEvents = expandCandidateActionEvents(state, ctx, normalizedAction);
  const events = [...preExistingStateEvents, ...candidateActionEvents].sort(compareSimulationEvents);

  for (const event of events) {
    projectedLiquid = reduceSimulationEvent({
      state,
      ctx,
      event,
      buckets: clonedBuckets,
      debts: clonedDebts,
      projectedLiquid,
    });
  }

  const buckets: BucketProjection[] = clonedBuckets.map((bucket) => {
    const projectedCommitted = bucket.postedSpendCents + bucket.pendingSpendCents;
    const limitCents = bucket.limitCents == null ? 0 : bucket.limitCents;
    const projectedRemaining = Math.max(0, limitCents - projectedCommitted);
    const projectedOverLimit =
      bucket.limitCents != null ? projectedCommitted > bucket.limitCents : false;
    return {
      bucketId: bucket.id,
      projectedPostedSpendCents: bucket.postedSpendCents,
      projectedPendingSpendCents: bucket.pendingSpendCents,
      projectedCommittedCents: projectedCommitted,
      projectedRemainingCents: projectedRemaining,
      projectedOverLimit,
    };
  });

  const debt: DebtProjection[] = getDebtAccounts(clonedDebts).map((account) => ({
    debtId: account.id,
    projectedBalanceCents: account.balanceCents,
    projectedUtilization:
      account.creditLimitCents != null && account.creditLimitCents > 0
        ? account.balanceCents / account.creditLimitCents
        : null,
  }));

  return {
    buckets,
    debt,
    cash: {
      projectedLiquidCents: projectedLiquid,
      projectedOverdraftRisk: null,
    },
  };
}
