import type { EngineContext, EngineState, ObjectiveWeights } from '../types.js';
import {
  engineInputVersion,
  type EngineInput,
  type EngineInputBucket,
  type EngineInputCard,
  type EngineInputDebt,
  type EngineInputDebtCardLink,
  type EngineInputWeights,
} from './EngineInput.js';

export type LegacyEngineAdapterOptions = {
  maxCandidates: number | null;
  weightsOverride: Partial<ObjectiveWeights> | null;
};

export type LegacyEngineAdapterInput = {
  state: EngineState;
  context: EngineContext;
  options: LegacyEngineAdapterOptions | null;
};

function hasNonEmptyString(value: string | null | undefined): value is string {
  return value !== null && value !== undefined && value !== '';
}

function toFiniteNumber(value: number | null | undefined): number | null {
  if (typeof value !== 'number') return null;
  if (!Number.isFinite(value)) return null;
  return value;
}

function coerceAmountCents(value: number | null | undefined): number {
  if (typeof value !== 'number') return 0;
  if (!Number.isFinite(value)) return 0;
  if (value <= 0) return 0;
  return Math.floor(value);
}

function coerceMaxCandidates(value: number | null | undefined): number | null {
  if (typeof value !== 'number') return null;
  if (!Number.isFinite(value)) return null;
  if (value <= 0) return null;
  return Math.floor(value);
}

function coerceWeights(raw: Partial<ObjectiveWeights> | null | undefined): EngineInputWeights | null {
  if (raw === null || raw === undefined) return null;

  const weights: EngineInputWeights = {
    rewards: null,
    runway: null,
    debtRelief: null,
    volatility: null,
    ruleViolations: null,
  };

  let hasAny = false;

  if (typeof raw.rewards === 'number' && Number.isFinite(raw.rewards)) {
    weights.rewards = raw.rewards;
    hasAny = true;
  }
  if (typeof raw.runway === 'number' && Number.isFinite(raw.runway)) {
    weights.runway = raw.runway;
    hasAny = true;
  }
  if (typeof raw.debtRelief === 'number' && Number.isFinite(raw.debtRelief)) {
    weights.debtRelief = raw.debtRelief;
    hasAny = true;
  }
  if (typeof raw.volatility === 'number' && Number.isFinite(raw.volatility)) {
    weights.volatility = raw.volatility;
    hasAny = true;
  }
  if (typeof raw.ruleViolations === 'number' && Number.isFinite(raw.ruleViolations)) {
    weights.ruleViolations = raw.ruleViolations;
    hasAny = true;
  }

  if (hasAny) {
    return weights;
  }

  return null;
}

function buildBuckets(state: EngineState): EngineInputBucket[] {
  return state.buckets.map((bucket) => {
    const limitCents = toFiniteNumber(bucket.limitCents);
    const postedSpendCents =
      typeof bucket.postedSpendCents === 'number' && Number.isFinite(bucket.postedSpendCents)
        ? bucket.postedSpendCents
        : 0;
    const pendingSpendCents =
      typeof bucket.pendingSpendCents === 'number' && Number.isFinite(bucket.pendingSpendCents)
        ? bucket.pendingSpendCents
        : 0;

    return {
      id: bucket.id,
      categoryKey: bucket.categoryKey,
      limitCents,
      postedSpendCents,
      pendingSpendCents,
      isEssential: bucket.isEssential === true,
      strictMode: bucket.strictMode === true,
    };
  });
}

function buildDebts(state: EngineState): EngineInputDebt[] {
  return state.debts.map((debt) => {
    const balanceCents =
      typeof debt.balanceCents === 'number' && Number.isFinite(debt.balanceCents)
        ? debt.balanceCents
        : 0;
    const creditLimitCents = toFiniteNumber(debt.creditLimitCents);
    const rawApr = toFiniteNumber(debt.aprPercent);
    const aprPercent = rawApr !== null && rawApr >= 0 ? rawApr : 0;

    return {
      id: debt.id,
      type: debt.type,
      balanceCents,
      creditLimitCents,
      aprPercent,
    };
  });
}

function buildCards(state: EngineState): EngineInputCard[] {
  return state.cards.map((card) => {
    const rewardRules = card.rewardRules.map((rule) => ({
      categoryKey: rule.categoryKey,
      rateType: rule.rateType,
      rateValue: rule.rateValue,
    }));

    return {
      id: card.id,
      isActive: card.isActive === true,
      isCredit: card.isCredit === true,
      rewardRules,
    };
  });
}

function buildDebtCardLinks(state: EngineState): EngineInputDebtCardLink[] {
  const links: EngineInputDebtCardLink[] = [];

  for (const card of state.cards) {
    if (card.isCredit !== true) continue;
    if (card.creditLimitCents === null || card.creditLimitCents === undefined) continue;
    if (!hasNonEmptyString(card.label)) continue;

    let matched: EngineState['debts'][number] | undefined;
    for (const debt of state.debts) {
      if (debt.type !== 'CREDIT_CARD') continue;
      if (debt.name !== card.label) continue;
      matched = debt;
      break;
    }

    if (matched === undefined) continue;

    links.push({ cardId: card.id, debtId: matched.id });
  }

  return links;
}

export function fromLegacy(input: LegacyEngineAdapterInput): EngineInput {
  const options = input.options;
  const maxCandidates =
    options !== null && options !== undefined
      ? coerceMaxCandidates(options.maxCandidates)
      : null;
  const weightsOverride =
    options !== null && options !== undefined ? coerceWeights(options.weightsOverride) : null;

  const cash = input.state.cash;
  const liquidCents =
    cash !== null && cash !== undefined ? toFiniteNumber(cash.liquidCents) : null;

  const maxCardUtilization =
    input.state.constraints.hard.maxCardUtilization !== undefined
      ? toFiniteNumber(input.state.constraints.hard.maxCardUtilization)
      : null;

  return {
    __version: engineInputVersion,
    request: {
      surface: input.context.surface,
      amountCents: coerceAmountCents(input.context.amountCents),
      merchantCategoryKey: hasNonEmptyString(input.context.merchantCategoryKey)
        ? input.context.merchantCategoryKey
        : null,
    },
    balances: {
      cash: {
        liquidCents,
      },
    },
    buckets: buildBuckets(input.state),
    debts: buildDebts(input.state),
    debtCardLinks: buildDebtCardLinks(input.state),
    cards: buildCards(input.state),
    constraints: {
      hard: {
        maxCardUtilization,
      },
    },
    preferences: {
      profileId: input.state.preferences.profileId,
      customWeights: coerceWeights(input.state.preferences.customWeights),
    },
    solver: {
      maxCandidates,
      weightsOverride,
    },
  };
}
