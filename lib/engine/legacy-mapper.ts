import type { RewardCategory } from '@prisma/client';
import type { BudgetVerdict, CardVerdict, OverallVerdict } from '@/lib/enums';
import type { EngineContext, EngineDecision, EngineState } from './types';
import type { EngineDecision as LegacyEngineDecision } from './legacy';

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
  if (!solverDecision || ctx.amountCents == null) {
    return fallback ?? null;
  }

  const amountCents = ctx.amountCents;
  const bucketProj = solverDecision.projections.buckets.at(0);
  const bucket = bucketProj ? state.buckets.find((b) => b.id === bucketProj.bucketId) : undefined;
  const limitCents = bucket?.limitCents ?? null;
  const spentAfterCents = bucketProj?.projectedSpentCents ?? null;
  const spentBeforeCents =
    spentAfterCents != null ? Math.max(spentAfterCents - amountCents, 0) : null;
  const remainingAfterCents =
    limitCents != null && spentAfterCents != null ? limitCents - spentAfterCents : null;
  const wouldExceed =
    limitCents != null && spentAfterCents != null ? spentAfterCents > limitCents : false;

  let budgetVerdict: BudgetVerdict = 'UNCONFIGURED';
  let coverageMode: LegacyEngineDecision['budget']['coverageMode'] = 'UNCONFIGURED';
  if (bucket) {
    coverageMode = 'BUDGETED';
    if (limitCents == null) {
      budgetVerdict = 'UNBOUNDED';
    } else if (wouldExceed) {
      budgetVerdict = 'BREAKS_BUDGET';
    } else if (remainingAfterCents != null && limitCents > 0 && remainingAfterCents / limitCents < 0.1) {
      budgetVerdict = 'BORDERLINE';
    } else {
      budgetVerdict = 'HEALTHY';
    }
  }

  const card =
    solverDecision.action.type === 'USE_CARD' && solverDecision.action.cardId
      ? state.cards.find((c) => c.id === solverDecision.action.cardId)
      : undefined;

  const categoryKey = ctx.merchantCategoryKey ?? 'OTHER';
  const rewardRule =
    card?.rewardRules.find((r) => r.categoryKey === categoryKey) ??
    card?.rewardRules.find((r) => r.categoryKey === 'GENERAL_MERCHANDISE') ??
    card?.rewardRules.find((r) => r.categoryKey === 'OTHER') ??
    null;

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
    strictMode: bucket?.strictMode ?? false,
    wouldExceed,
  };
  if (bucket?.id) budget.bucketId = bucket.id;
  if (bucket?.name) budget.name = bucket.name;
  if (limitCents != null) budget.limitCents = limitCents;
  if (spentBeforeCents != null) budget.spentBeforeCents = spentBeforeCents;
  if (spentAfterCents != null) budget.spentAfterCents = spentAfterCents;
  if (remainingAfterCents != null) budget.remainingAfterCents = remainingAfterCents;

  const cardPayload: LegacyEngineDecision['card'] = {
    verdict: cardVerdict,
    hasCardData: Boolean(card),
  };
  if (card?.id) cardPayload.cardId = card.id;
  if (card?.label) cardPayload.cardNickname = card.label;
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
