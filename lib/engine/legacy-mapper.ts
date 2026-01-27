import type { RewardCategory } from '../enums.js';
import type { BudgetVerdict, CardVerdict, OverallVerdict } from '../enums.js';
import type { EngineContext, EngineDecision, EngineState } from './types.js';
import type { EngineDecision as LegacyEngineDecision } from './legacy.js';

function hasNonEmptyString(value?: string | null): value is string {
  return value !== undefined && value !== null && value !== '';
}

function deriveOverallVerdict(budgetVerdict: BudgetVerdict, cardVerdict: CardVerdict): OverallVerdict {
  if (budgetVerdict === 'UNCONFIGURED') return 'UNKNOWN';
  if (budgetVerdict === 'BREAKS_BUDGET') return 'RED';
  if (budgetVerdict === 'BORDERLINE') return 'YELLOW';
  if (budgetVerdict === 'UNBOUNDED') {
    if (cardVerdict === 'NO_CARD_DATA') return 'UNKNOWN';
    return 'GREEN';
  }
  if (cardVerdict === 'NO_CARD_DATA') return 'YELLOW';
  return 'GREEN';
}

function computeCherryIncentive(amountCents: number, budgetVerdict: BudgetVerdict): {
  pointsIfFollowed: number;
  expiryMinutes: number;
} {
  if (amountCents <= 0) return { pointsIfFollowed: 0, expiryMinutes: 0 };
  const base = Math.min(Math.floor(amountCents / 1000), 20);
  let multiplier = 1;
  if (budgetVerdict === 'HEALTHY') multiplier = 2;
  else if (budgetVerdict === 'BREAKS_BUDGET') multiplier = 0;
  return { pointsIfFollowed: base * multiplier, expiryMinutes: 15 };
}

export function mapSolverDecisionToLegacyDecision(input: {
  solverDecision?: EngineDecision;
  state: EngineState;
  ctx: EngineContext;
  category: RewardCategory;
  fallback?: LegacyEngineDecision;
}): LegacyEngineDecision | null {
  const { solverDecision, state, ctx, category, fallback } = input;
  if (
    solverDecision === undefined ||
    solverDecision === null ||
    ctx.amountCents === null ||
    ctx.amountCents === undefined
  ) {
    return fallback == null ? null : fallback;
  }

  let isCardAction = false;
  if (solverDecision.action.type === 'USE_CARD') {
    isCardAction = true;
  } else if (solverDecision.action.type === 'USE_CARD_WITH_PAYDOWN') {
    isCardAction = true;
  }

  if (!isCardAction && fallback !== undefined) {
    return fallback;
  }

  const amountCents = ctx.amountCents;
  const bucketProj = solverDecision.projections.buckets.at(0);
  const bucket =
    bucketProj !== undefined
      ? state.buckets.find((b) => b.id === bucketProj.bucketId)
      : undefined;
  const limitCents =
    bucket !== undefined && bucket.limitCents != null ? bucket.limitCents : null;
  const committedAfterCents =
    bucketProj !== undefined && bucketProj.projectedCommittedCents != null
      ? bucketProj.projectedCommittedCents
      : null;
  const committedBeforeCents =
    bucket !== undefined && bucket.committedCents != null ? bucket.committedCents : null;
  const remainingAfterCents =
    limitCents != null && committedAfterCents != null ? limitCents - committedAfterCents : null;
  const wouldExceed =
    limitCents != null && committedAfterCents != null ? committedAfterCents > limitCents : false;

  let budgetVerdict: BudgetVerdict = 'UNCONFIGURED';
  let coverageMode: LegacyEngineDecision['budget']['coverageMode'] = 'UNCONFIGURED';
  if (bucket !== undefined) {
    coverageMode = 'BUDGETED';
    if (limitCents == null) {
      budgetVerdict = 'UNBOUNDED';
    } else if (wouldExceed) {
      budgetVerdict = 'BREAKS_BUDGET';
    } else if (
      remainingAfterCents != null &&
      limitCents > 0 &&
      remainingAfterCents / limitCents < 0.1
    ) {
      budgetVerdict = 'BORDERLINE';
    } else {
      budgetVerdict = 'HEALTHY';
    }
  }

  const card =
    (solverDecision.action.type === 'USE_CARD' ||
      solverDecision.action.type === 'USE_CARD_WITH_PAYDOWN') &&
    hasNonEmptyString(solverDecision.action.cardId)
      ? state.cards.find((c) => c.id === solverDecision.action.cardId)
      : undefined;

  const categoryKey = ctx.merchantCategoryKey == null ? 'OTHER' : ctx.merchantCategoryKey;
  let rewardRule = null;
  if (card !== undefined) {
    const byCategory = card.rewardRules.find((r) => r.categoryKey === categoryKey);
    if (byCategory !== undefined) {
      rewardRule = byCategory;
    } else {
      const general = card.rewardRules.find((r) => r.categoryKey === 'GENERAL_MERCHANDISE');
      if (general !== undefined) {
        rewardRule = general;
      } else {
        const fallback = card.rewardRules.find((r) => r.categoryKey === 'OTHER');
        if (fallback !== undefined) {
          rewardRule = fallback;
        }
      }
    }
  }

  const dollars = amountCents / 100;
  const multiplier =
    rewardRule?.rateType === 'POINTS_PER_DOLLAR' ? rewardRule.rateValue : null;
  const estimatedRewards =
    rewardRule == null
      ? null
      : rewardRule.rateType === 'POINTS_PER_DOLLAR'
        ? Math.floor(dollars * rewardRule.rateValue)
        : Math.floor(amountCents * rewardRule.rateValue);

  const cardVerdict: CardVerdict = card ? 'OPTIMAL' : 'NO_CARD_DATA';
  const overallVerdict = deriveOverallVerdict(budgetVerdict, cardVerdict);
  const cherryIncentive =
    cardVerdict === 'NO_CARD_DATA'
      ? { pointsIfFollowed: 0, expiryMinutes: 0 }
      : computeCherryIncentive(amountCents, budgetVerdict);

  const budget: LegacyEngineDecision['budget'] = {
    verdict: budgetVerdict,
    coverageMode,
    hasBucket: Boolean(bucket),
    strictMode: bucket && bucket.strictMode != null ? bucket.strictMode : false,
    wouldExceed,
  };
  if (bucket?.id !== undefined && bucket.id !== null && bucket.id !== '') {
    budget.bucketId = bucket.id;
  }
  if (bucket?.name !== undefined && bucket.name !== null && bucket.name !== '') {
    budget.name = bucket.name;
  }
  if (limitCents != null) budget.limitCents = limitCents;
  if (committedBeforeCents != null) budget.spentBeforeCents = committedBeforeCents;
  if (committedAfterCents != null) budget.spentAfterCents = committedAfterCents;
  if (remainingAfterCents != null) budget.remainingAfterCents = remainingAfterCents;

  const cardPayload: LegacyEngineDecision['card'] = {
    verdict: cardVerdict,
    hasCardData: Boolean(card),
  };
  if (card?.id !== undefined && card.id !== null && card.id !== '') cardPayload.cardId = card.id;
  if (card?.label !== undefined && card.label !== null && card.label !== '') {
    cardPayload.cardNickname = card.label;
  }
  if (multiplier != null) cardPayload.multiplier = multiplier;
  if (estimatedRewards != null) cardPayload.estimatedRewards = estimatedRewards;

  return {
    category,
    amountCents,
    budget,
    card: cardPayload,
    overallVerdict,
    cherryIncentive,
  };
}
