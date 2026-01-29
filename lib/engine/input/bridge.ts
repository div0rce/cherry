import type { EngineContext, EngineState, ObjectiveWeights } from '../types.js';
import type {
  EngineInput,
  EngineInputCard,
  EngineInputDebt,
  EngineInputDebtCardLink,
  EngineInputWeights,
} from './EngineInput.js';

function hasNonEmptyString(value: string | null | undefined): value is string {
  return value !== null && value !== undefined && value !== '';
}

function buildLinkLabels(
  links: EngineInputDebtCardLink[]
): {
  byDebtId: Map<string, string>;
  byCardId: Map<string, string>;
} {
  const byDebtId = new Map<string, string>();
  const byCardId = new Map<string, string>();

  for (const link of links) {
    if (!hasNonEmptyString(link.cardId) || !hasNonEmptyString(link.debtId)) {
      continue;
    }
    let label = byDebtId.get(link.debtId);
    if (label === undefined) {
      label = `link:${link.debtId}`;
      byDebtId.set(link.debtId, label);
    }
    byCardId.set(link.cardId, label);
  }

  return { byDebtId, byCardId };
}

function weightsToPartial(weights: EngineInputWeights | null | undefined): Partial<ObjectiveWeights> | undefined {
  if (weights === null || weights === undefined) return undefined;

  const partial: Partial<ObjectiveWeights> = {};
  let hasAny = false;

  if (weights.rewards !== null) {
    partial.rewards = weights.rewards;
    hasAny = true;
  }
  if (weights.runway !== null) {
    partial.runway = weights.runway;
    hasAny = true;
  }
  if (weights.debtRelief !== null) {
    partial.debtRelief = weights.debtRelief;
    hasAny = true;
  }
  if (weights.volatility !== null) {
    partial.volatility = weights.volatility;
    hasAny = true;
  }
  if (weights.ruleViolations !== null) {
    partial.ruleViolations = weights.ruleViolations;
    hasAny = true;
  }

  return hasAny ? partial : undefined;
}

function toRewardRules(card: EngineInputCard): EngineState['cards'][number]['rewardRules'] {
  return card.rewardRules.map((rule) => ({
    id: `${card.id}:${rule.categoryKey}:${rule.rateType}`,
    cardId: card.id,
    categoryKey: rule.categoryKey,
    mccPattern: null,
    rateType: rule.rateType,
    rateValue: rule.rateValue,
    capAmountCents: null,
    capPeriod: null,
    promoStartMs: null,
    promoEndMs: null,
    source: 'STATIC_CONFIG',
    confidence: 1,
  }));
}

function toCards(
  input: EngineInput,
  userId: string,
  linkLabels: Map<string, string>
): EngineState['cards'] {
  return input.cards.map((card) => {
    const linkedLabel = linkLabels.get(card.id);
    const label = linkedLabel !== undefined ? linkedLabel : `card:${card.id}`;
    const creditLimitCents = card.isCredit ? 0 : null;

    return {
      id: card.id,
      userId,
      issuer: 'unknown',
      productSlug: null,
      label,
      last4: null,
      network: 'OTHER',
      isCredit: card.isCredit === true,
      isActive: card.isActive === true,
      isVirtual: false,
      rewardRules: toRewardRules(card),
      creditLimitCents,
      currentBalanceCents: null,
    };
  });
}

function toDebts(
  debts: EngineInputDebt[],
  linkLabels: Map<string, string>
): EngineState['debts'] {
  return debts.map((debt) => {
    const linkedLabel = linkLabels.get(debt.id);
    const name = linkedLabel !== undefined ? linkedLabel : `debt:${debt.id}`;

    return {
      id: debt.id,
      name,
      type: debt.type,
      balanceCents: debt.balanceCents,
      creditLimitCents: debt.creditLimitCents,
      aprPercent: debt.aprPercent,
      minPaymentCents: null,
      dueDayOfMonth: null,
    };
  });
}

export function buildEngineStateFromInput(params: {
  input: EngineInput;
  userId: string;
}): EngineState {
  const { input, userId } = params;
  const linkLabels = buildLinkLabels(input.debtCardLinks);

  const customWeights =
    input.preferences.customWeights === null
      ? undefined
      : weightsToPartial(input.preferences.customWeights);

  return {
    userId,
    cards: toCards(input, userId, linkLabels.byCardId),
    buckets: input.buckets.map((bucket) => {
      const committed = bucket.postedSpendCents + bucket.pendingSpendCents;
      let remaining = 0;
      if (bucket.limitCents !== null) {
        const rawRemaining = bucket.limitCents - committed;
        remaining = rawRemaining > 0 ? rawRemaining : 0;
      }

      return {
        id: bucket.id,
        name: `bucket:${bucket.id}`,
        categoryKey: bucket.categoryKey,
        limitCents: bucket.limitCents,
        postedSpendCents: bucket.postedSpendCents,
        pendingSpendCents: bucket.pendingSpendCents,
        committedCents: committed,
        remainingCents: remaining,
        period: 'MONTHLY',
        isEssential: bucket.isEssential === true,
        strictMode: bucket.strictMode === true,
      };
    }),
    debts: toDebts(input.debts, linkLabels.byDebtId),
    constraints: {
      hard: {
        minEssentialCoverageDays: 0,
        maxCardUtilization: input.constraints.hard.maxCardUtilization,
      },
      soft: {
        avoidInterest: false,
        avoidNewDebt: false,
      },
    },
    world: {
      baseInterestRate: null,
      inflationEstimate: null,
    },
    cash: {
      liquidCents: input.balances.cash.liquidCents,
      nextPaycheckDateMs: null,
      nextPaycheckNetCents: null,
    },
    preferences:
      customWeights === undefined
        ? { profileId: input.preferences.profileId }
        : { profileId: input.preferences.profileId, customWeights },
  };
}

export function buildEngineContextFromInput(params: {
  input: EngineInput;
  nowMs: number;
}): EngineContext {
  const { input, nowMs } = params;
  return {
    surface: input.request.surface,
    nowMs,
    merchantName: null,
    merchantDomain: null,
    merchantCategoryKey: input.request.merchantCategoryKey,
    mcc: null,
    amountCents: input.request.amountCents,
    locationCity: null,
    locationCountry: null,
    payPeriodDayOfCycle: null,
  };
}

export function buildSolverOptionsFromInput(input: EngineInput): {
  weights: Partial<ObjectiveWeights> | null;
  maxCandidates: number | null;
} {
  const weights = weightsToPartial(input.solver.weightsOverride);
  const maxCandidates =
    input.solver.maxCandidates !== null ? input.solver.maxCandidates : null;
  return { weights: weights ?? null, maxCandidates };
}
