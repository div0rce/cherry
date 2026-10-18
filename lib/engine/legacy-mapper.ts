import type { RewardCategory } from '../enums.js';
import type { BudgetVerdict, CardVerdict, OverallVerdict } from '../enums.js';
import type { EngineContext, EngineDecision, EngineState } from './types.js';
import type { EngineDecision as LegacyEngineDecision } from '../legacy-engine.js';
import { getRewardSemanticsForCardSpend, type RewardSemantics } from './reward-semantics.js';

type LegacyBudget = LegacyEngineDecision['budget'];
type LegacyCard = LegacyEngineDecision['card'];
type EngineBucket = EngineState['buckets'][number];
type EngineCard = EngineState['cards'][number];

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

export function pickTopLegacySurfaceDecision(
  decisions: EngineDecision[]
): EngineDecision | undefined {
  return decisions.at(0);
}

type BudgetFacts = {
  bucket: EngineBucket | undefined;
  limitCents: number | null;
  committedAfterCents: number | null;
  committedBeforeCents: number | null;
  remainingAfterCents: number | null;
  wouldExceed: boolean;
};

function numberOrNull(value: number | null | undefined): number | null {
  return value != null ? value : null;
}

function textOrUndefined(value: string | null | undefined): string | undefined {
  return hasNonEmptyString(value) ? value : undefined;
}

function assignDefined<T extends object, K extends keyof T>(
  target: T,
  key: K,
  value: T[K] | null | undefined
): void {
  if (value != null) target[key] = value;
}

function findProjectedBucket(
  state: EngineState,
  bucketProj: EngineDecision['projections']['buckets'][number] | undefined
): EngineBucket | undefined {
  if (bucketProj === undefined) return undefined;
  return state.buckets.find((b) => b.id === bucketProj.bucketId);
}

function deriveRemaining(
  limitCents: number | null,
  committedAfterCents: number | null
): Pick<BudgetFacts, 'remainingAfterCents' | 'wouldExceed'> {
  if (limitCents == null || committedAfterCents == null) {
    return { remainingAfterCents: null, wouldExceed: false };
  }
  return {
    remainingAfterCents: limitCents - committedAfterCents,
    wouldExceed: committedAfterCents > limitCents,
  };
}

function readBudgetFacts(solverDecision: EngineDecision, state: EngineState): BudgetFacts {
  const bucketProj = solverDecision.projections.buckets.at(0);
  const bucket = findProjectedBucket(state, bucketProj);
  const limitCents = numberOrNull(bucket?.limitCents);
  const committedAfterCents = numberOrNull(bucketProj?.projectedCommittedCents);
  return {
    bucket,
    limitCents,
    committedAfterCents,
    committedBeforeCents: numberOrNull(bucket?.committedCents),
    ...deriveRemaining(limitCents, committedAfterCents),
  };
}

function isBorderline(remainingAfterCents: number | null, limitCents: number): boolean {
  if (remainingAfterCents == null) return false;
  if (!(limitCents > 0)) return false;
  return remainingAfterCents / limitCents < 0.1;
}

function deriveBudgetVerdict(facts: BudgetFacts): BudgetVerdict {
  if (facts.bucket === undefined) return 'UNCONFIGURED';
  if (facts.limitCents == null) return 'UNBOUNDED';
  if (facts.wouldExceed) return 'BREAKS_BUDGET';
  if (isBorderline(facts.remainingAfterCents, facts.limitCents)) return 'BORDERLINE';
  return 'HEALTHY';
}

function findSpendCard(solverDecision: EngineDecision, state: EngineState): EngineCard | undefined {
  const action = solverDecision.action;
  if (action.type !== 'USE_CARD' && action.type !== 'USE_CARD_WITH_PAYDOWN') return undefined;
  if (!hasNonEmptyString(action.cardId)) return undefined;
  return state.cards.find((c) => c.id === action.cardId);
}

function buildBudgetPayload(facts: BudgetFacts, budgetVerdict: BudgetVerdict): LegacyBudget {
  const { bucket } = facts;
  const budget: LegacyBudget = {
    verdict: budgetVerdict,
    coverageMode: bucket !== undefined ? 'BUDGETED' : 'UNCONFIGURED',
    hasBucket: Boolean(bucket),
    strictMode: bucket?.strictMode != null ? bucket.strictMode : false,
    wouldExceed: facts.wouldExceed,
  };
  assignDefined(budget, 'bucketId', textOrUndefined(bucket?.id));
  assignDefined(budget, 'name', textOrUndefined(bucket?.name));
  assignDefined(budget, 'limitCents', facts.limitCents);
  assignDefined(budget, 'spentBeforeCents', facts.committedBeforeCents);
  assignDefined(budget, 'spentAfterCents', facts.committedAfterCents);
  assignDefined(budget, 'remainingAfterCents', facts.remainingAfterCents);
  return budget;
}

function buildCardPayload(
  card: EngineCard | undefined,
  cardVerdict: CardVerdict,
  rewardSemantics: RewardSemantics | null
): LegacyCard {
  const cardPayload: LegacyCard = {
    verdict: cardVerdict,
    hasCardData: Boolean(card),
  };
  assignDefined(cardPayload, 'cardId', textOrUndefined(card?.id));
  assignDefined(cardPayload, 'cardNickname', textOrUndefined(card?.label));
  if (rewardSemantics !== null) {
    cardPayload.rewardUnit = rewardSemantics.rewardUnit;
    cardPayload.rewardRate = rewardSemantics.rewardRate;
    cardPayload.rewardPoints = rewardSemantics.rewardPoints;
    cardPayload.rewardValueCents = rewardSemantics.rewardValueCents;
  }
  return cardPayload;
}

export function mapSolverDecisionToLegacyDecision(input: {
  solverDecision?: EngineDecision;
  state: EngineState;
  ctx: EngineContext;
  category: RewardCategory;
  fallback?: LegacyEngineDecision;
}): LegacyEngineDecision | null {
  const { solverDecision, state, ctx, category, fallback } = input;
  if (solverDecision == null || ctx.amountCents == null) {
    return fallback == null ? null : fallback;
  }

  const amountCents = ctx.amountCents;
  const facts = readBudgetFacts(solverDecision, state);
  const budgetVerdict = deriveBudgetVerdict(facts);
  const card = findSpendCard(solverDecision, state);

  const rewardSemantics = getRewardSemanticsForCardSpend({
    card,
    amountCents,
    merchantCategoryKey: ctx.merchantCategoryKey,
  });

  const cardVerdict: CardVerdict = card ? 'OPTIMAL' : 'NO_CARD_DATA';
  const overallVerdict = deriveOverallVerdict(budgetVerdict, cardVerdict);
  const cherryIncentive =
    cardVerdict === 'NO_CARD_DATA'
      ? { pointsIfFollowed: 0, expiryMinutes: 0 }
      : computeCherryIncentive(amountCents, budgetVerdict);

  return {
    category,
    amountCents,
    budget: buildBudgetPayload(facts, budgetVerdict),
    card: buildCardPayload(card, cardVerdict, rewardSemantics),
    overallVerdict,
    cherryIncentive,
  };
}
