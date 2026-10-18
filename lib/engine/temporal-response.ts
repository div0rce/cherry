import type {
  EvaluatedScheduledPaydown,
  ScheduledPaydownEvaluation,
  ScheduledPaydownSourceStatus,
} from './scheduled-paydowns.js';

export type { ScheduledPaydownSourceStatus } from './scheduled-paydowns.js';

export type TemporalContext = {
  modelMode: 'PRESENT_ONLY' | 'PRESENT_PLUS_FUTURE_EVENTS';
  decisionTimeMs: number;
  horizonEndMs: number | null;
  includesScheduledPaydowns: boolean;
  contingency: 'NONE' | 'REQUIRES_FUTURE_EVENTS';
  scheduledPaydownSourceStatus: ScheduledPaydownSourceStatus;
};

export type ContingentRecommendation = null | {
  action: {
    kind: 'SCHEDULED_PAYDOWN';
    debtId: string;
    amountCents: number;
    effectiveAtMs: number;
  };
  message: string;
  status: 'NOT_EFFECTIVE_YET';
};

export type FutureRiskContext = null | {
  message: string;
  nextEffectiveAtMs: number | null;
  eventCount: number;
  totalScheduledAmountCents: number;
};

export type TemporalResponseShape = {
  temporalContext: TemporalContext;
  contingentRecommendation: ContingentRecommendation;
  futureRiskContext: FutureRiskContext;
};

function formatMoney(cents: number): string {
  const centsPerDollar = 100;
  const sign = cents < 0 ? '-' : '';
  const absoluteCents = Math.abs(cents);
  const dollars = Math.trunc(absoluteCents / centsPerDollar);
  const centsRemainder = absoluteCents % centsPerDollar;
  return `${sign}$${dollars}.${String(centsRemainder).padStart(2, '0')}`;
}

function buildContingentRecommendation(
  paydowns: EvaluatedScheduledPaydown[]
): ContingentRecommendation {
  const [selected] = [...paydowns].sort((a, b) => {
    if (a.effectiveAtMs !== b.effectiveAtMs) {
      return a.effectiveAtMs - b.effectiveAtMs;
    }
    return a.sourceOrder - b.sourceOrder;
  });
  if (selected === undefined) return null;
  return {
    action: {
      kind: 'SCHEDULED_PAYDOWN',
      debtId: selected.debtId,
      amountCents: selected.amountCents,
      effectiveAtMs: selected.effectiveAtMs,
    },
    message: `A scheduled paydown of ${formatMoney(selected.amountCents)} is set for a future time and is not effective yet.`,
    status: 'NOT_EFFECTIVE_YET',
  };
}

function buildFutureRiskContext(
  paydowns: EvaluatedScheduledPaydown[]
): FutureRiskContext {
  if (paydowns.length <= 1) return null;
  const nextEffectiveAtMs = paydowns.reduce<number | null>((earliest, paydown) => {
    if (earliest == null) return paydown.effectiveAtMs;
    return Math.min(earliest, paydown.effectiveAtMs);
  }, null);
  const totalScheduledAmountCents = paydowns.reduce(
    (sum, paydown) => sum + paydown.amountCents,
    0
  );
  return {
    message:
      'Explicit scheduled paydowns exist for future times and are not effective yet.',
    nextEffectiveAtMs,
    eventCount: paydowns.length,
    totalScheduledAmountCents,
  };
}

function latestEffectiveAtMs(paydowns: EvaluatedScheduledPaydown[]): number {
  return Math.max(...paydowns.map((paydown) => paydown.effectiveAtMs));
}

function contingencyFor(
  contingentRecommendation: ContingentRecommendation,
  futureRiskContext: FutureRiskContext
): TemporalContext['contingency'] {
  if (contingentRecommendation !== null) return 'REQUIRES_FUTURE_EVENTS';
  return futureRiskContext !== null ? 'REQUIRES_FUTURE_EVENTS' : 'NONE';
}

function buildPresentOnlyShape(
  evaluation: ScheduledPaydownEvaluation,
  decisionTimeMs: number
): TemporalResponseShape {
  return {
    temporalContext: {
      modelMode: 'PRESENT_ONLY',
      decisionTimeMs,
      horizonEndMs: null,
      includesScheduledPaydowns: false,
      contingency: 'NONE',
      scheduledPaydownSourceStatus: evaluation.sourceStatus,
    },
    contingentRecommendation: null,
    futureRiskContext: null,
  };
}

export function buildTemporalResponseShape(
  evaluation: ScheduledPaydownEvaluation,
  decisionTimeMs: number
): TemporalResponseShape {
  if (evaluation.futureEligible.length === 0) {
    return buildPresentOnlyShape(evaluation, decisionTimeMs);
  }

  // Both are null when contingency is NONE, so they pass through unchanged.
  const contingentRecommendation = buildContingentRecommendation(evaluation.futureEligible);
  const futureRiskContext = buildFutureRiskContext(evaluation.futureEligible);

  return {
    temporalContext: {
      modelMode: 'PRESENT_PLUS_FUTURE_EVENTS',
      decisionTimeMs,
      horizonEndMs: latestEffectiveAtMs(evaluation.futureEligible),
      includesScheduledPaydowns: true,
      contingency: contingencyFor(contingentRecommendation, futureRiskContext),
      scheduledPaydownSourceStatus: evaluation.sourceStatus,
    },
    contingentRecommendation,
    futureRiskContext,
  };
}
