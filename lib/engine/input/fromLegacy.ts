import {
  getCashState,
  getDebtAccounts,
  hasKnownBucketEssentiality,
  isBucketEssential,
  type DebtAccount,
  type EngineContext,
  type EngineState,
  type ObjectiveWeights,
} from '../types.js';
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

function finiteOrZero(value: number | null | undefined): number {
  const finite = toFiniteNumber(value);
  return finite !== null ? finite : 0;
}

function coerceWeights(raw: Partial<ObjectiveWeights> | null | undefined): EngineInputWeights | null {
  if (raw === null || raw === undefined) return null;

  const weights: EngineInputWeights = {
    rewards: toFiniteNumber(raw.rewards),
    runway: toFiniteNumber(raw.runway),
    debtRelief: toFiniteNumber(raw.debtRelief),
  };

  const hasAny = [weights.rewards, weights.runway, weights.debtRelief].some(
    (value) => value !== null
  );
  return hasAny ? weights : null;
}

function buildBuckets(state: EngineState): EngineInputBucket[] {
  return state.buckets.map((bucket) => {
    const limitCents = toFiniteNumber(bucket.limitCents);
    const postedSpendCents = finiteOrZero(bucket.postedSpendCents);
    const pendingSpendCents = finiteOrZero(bucket.pendingSpendCents);

    return {
      id: bucket.id,
      categoryKey: bucket.categoryKey,
      limitCents,
      postedSpendCents,
      pendingSpendCents,
      isEssential: hasKnownBucketEssentiality(bucket) && isBucketEssential(bucket),
      strictMode: bucket.strictMode === true,
    };
  });
}

function buildDebts(state: EngineState): EngineInputDebt[] {
  return getDebtAccounts(state.debts).map((debt) => {
    const balanceCents = finiteOrZero(debt.balanceCents);
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

function findDebtByCardLabel(
  card: EngineState['cards'][number],
  debts: readonly DebtAccount[]
): DebtAccount | undefined {
  if (card.creditLimitCents === null || card.creditLimitCents === undefined) return undefined;
  if (!hasNonEmptyString(card.label)) return undefined;
  const label = card.label;
  return debts.find((debt) => debt.type === 'CREDIT_CARD' && debt.name === label);
}

function linkedDebtIdForCard(
  card: EngineState['cards'][number],
  debts: readonly DebtAccount[]
): string | undefined {
  if (card.isCredit !== true) return undefined;
  if (hasNonEmptyString(card.linkedDebtId)) return card.linkedDebtId;
  return findDebtByCardLabel(card, debts)?.id;
}

function buildDebtCardLinks(state: EngineState): EngineInputDebtCardLink[] {
  const links: EngineInputDebtCardLink[] = [];
  const debts = getDebtAccounts(state.debts);

  for (const card of state.cards) {
    const debtId = linkedDebtIdForCard(card, debts);
    if (debtId === undefined) continue;
    links.push({ cardId: card.id, debtId });
  }

  return links;
}

function hasOptions(
  options: LegacyEngineAdapterOptions | null | undefined
): options is LegacyEngineAdapterOptions {
  return options !== null && options !== undefined;
}

export function fromLegacy(input: LegacyEngineAdapterInput): EngineInput {
  const options = input.options;
  const maxCandidates = hasOptions(options) ? coerceMaxCandidates(options.maxCandidates) : null;
  const weightsOverride = hasOptions(options) ? coerceWeights(options.weightsOverride) : null;

  const cash = getCashState(input.state.cash);
  const liquidCents = cash != null ? toFiniteNumber(cash.liquidCents) : null;

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
