// Legacy engine entrypoint retained for compatibility with existing flows.
// New code should prefer the typed solver in lib/engine/solver.
import { prisma } from '../../prisma.js';
import { RewardCategory } from '@prisma/client';
import type { Bucket } from '@prisma/client';
import { applyInMemoryRollover } from '../../buckets/periods.js';
import { assertPrismaReady } from '../assert-prisma-ready.js';
import type {
  CategoryCoverageMode,
  EngineDecision,
  LegacyEngineInput,
} from '../../legacy-engine-types.js';
import type { RewardSemantics } from '../../engine/reward-semantics.js';

export type {
  CategoryCoverageMode,
  EngineDecision,
  LegacyEngineInput,
  EvaluateTransactionResult,
} from '../../legacy-engine-types.js';

const MERCHANT_CATEGORY_PATTERNS: readonly [RegExp, RewardCategory][] = [
  [/air|flight|airline|airport/, RewardCategory.AIR_TRAVEL],
  [/hotel|inn|motel|resort|lodge/, RewardCategory.HOTEL],
  [/uber|lyft|taxi|ride/, RewardCategory.TRAVEL],
  [/grocery|market|supermarket/, RewardCategory.GROCERIES],
  [/restaurant|diner|cafe|food|grill|bbq|pizza|burger/, RewardCategory.DINING],
  [/gas|fuel|petro|shell|exxon|chevron|bp/, RewardCategory.GAS],
  [/stream|subscription|netflix|spotify|hulu|disney|apple tv/, RewardCategory.ENTERTAINMENT],
];

function isIntegerCode(value?: number | null): value is number {
  return Number.isInteger(value);
}

function isBlankCategory(category?: string | RewardCategory | null): category is null | undefined | '' {
  return category === null || category === undefined || category === '';
}

async function categoryFromMcc(mccCode?: number | null): Promise<RewardCategory | null> {
  if (!isIntegerCode(mccCode)) return null;
  const mapping = await prisma.mccToRewardCategory.findFirst({
    where: { mccCode, isDefault: true },
  });
  return mapping === null ? null : mapping.category;
}

function categoryFromExplicit(category?: string | RewardCategory | null): RewardCategory | null {
  if (isBlankCategory(category)) return null;
  const upper = String(category).trim().toUpperCase();
  return (Object.values(RewardCategory) as string[]).includes(upper) ? (upper as RewardCategory) : null;
}

function categoryFromMerchant(merchantName?: string | null): RewardCategory {
  const merchant = merchantName?.toLowerCase() ?? '';
  const match = MERCHANT_CATEGORY_PATTERNS.find(([pattern]) => pattern.test(merchant));
  return match === undefined ? RewardCategory.OTHER : match[1];
}

export async function resolveCategory(input: {
  mccCode?: number | null;
  category?: string | RewardCategory | null;
  merchantName?: string | null;
}): Promise<RewardCategory> {
  assertPrismaReady(prisma);
  const { mccCode, category, merchantName } = input;
  return (
    (await categoryFromMcc(mccCode)) ??
    categoryFromExplicit(category) ??
    categoryFromMerchant(merchantName)
  );
}

function deriveOverallVerdict(
  budget: EngineDecision['budget']['verdict'],
  card: EngineDecision['card']['verdict']
): EngineDecision['overallVerdict'] {
  if (budget === 'UNCONFIGURED') return 'UNKNOWN';
  if (budget === 'BREAKS_BUDGET') return 'RED';
  if (budget === 'BORDERLINE') return 'YELLOW';
  if (budget === 'UNBOUNDED') {
    if (card === 'NO_CARD_DATA') return 'UNKNOWN';
    return 'GREEN';
  }
  // budget HEALTHY
  if (card === 'NO_CARD_DATA') return 'YELLOW';
  return 'GREEN';
}

function computeCherryIncentive(
  amountCents: number,
  budgetVerdict: EngineDecision['budget']['verdict']
): {
  pointsIfFollowed: number;
  expiryMinutes: number;
} {
  if (amountCents <= 0) return { pointsIfFollowed: 0, expiryMinutes: 0 };
  const base = Math.min(Math.floor(amountCents / 1000), 20); // 0-20 base points
  let multiplier = 1;
  if (budgetVerdict === 'HEALTHY') multiplier = 2;
  else if (budgetVerdict === 'BREAKS_BUDGET') multiplier = 0;
  return { pointsIfFollowed: base * multiplier, expiryMinutes: 15 };
}

async function getCategoryCoverage(
  userId: string,
  category: RewardCategory
): Promise<{ coverageMode: CategoryCoverageMode; buckets: Bucket[] }> {
  const buckets = await prisma.bucket.findMany({
    where: { userId, category },
    orderBy: { createdAt: 'asc' },
  });

  if (buckets.length > 0) return { coverageMode: 'BUDGETED', buckets };

  const pref = await prisma.categoryPreference.findUnique({
    where: {
      userId_category: { userId, category },
    },
  });

  if (pref !== null && pref.mode === 'UNBUDGETED') {
    return { coverageMode: 'UNBUDGETED_INTENTIONAL', buckets: [] };
  }

  return { coverageMode: 'UNCONFIGURED', buckets: [] };
}

type RewardRuleLike = { category: RewardCategory; multiplier: number | null };

function cardMultiplier(rewardRules: readonly RewardRuleLike[], category: RewardCategory): number {
  const exactRule = rewardRules.find((r) => r.category === category);
  const fallbackRule = rewardRules.find(
    (r) =>
      r.category === RewardCategory.GENERAL_MERCHANDISE ||
      r.category === RewardCategory.OTHER
  );
  const rule = exactRule ?? fallbackRule;
  return rule?.multiplier ?? 1;
}

function isBetterCard(
  multiplier: number,
  bestMultiplier: number,
  cardId: string,
  bestCard: { id: string } | null
): boolean {
  if (multiplier > bestMultiplier) return true;
  if (multiplier !== bestMultiplier || bestCard === null) return false;
  return cardId < bestCard.id;
}

async function resolveBestCardForTransaction(input: {
  userId: string;
  category: RewardCategory;
  amountCents: number;
}) {
  const cards = await prisma.card.findMany({
    where: { userId: input.userId },
    include: {
      rewardRules: true,
    },
  });

  if (cards.length === 0) {
    return {
      verdict: 'NO_CARD_DATA' as EngineDecision['card']['verdict'],
      hasCardData: false,
    };
  }

  let bestCard: (typeof cards)[number] | null = null;
  let bestMultiplier = 0;

  for (const card of cards) {
    const multiplier = cardMultiplier(card.rewardRules, input.category);
    if (isBetterCard(multiplier, bestMultiplier, card.id, bestCard)) {
      bestCard = card;
      bestMultiplier = multiplier;
    }
  }

  if (bestCard === null) {
    return {
      verdict: 'NO_CARD_DATA' as EngineDecision['card']['verdict'],
      hasCardData: false,
    };
  }

  const rewardSemantics: RewardSemantics = {
    rewardUnit: 'issuer_points',
    rewardRate: bestMultiplier,
    rewardPoints: Math.floor((input.amountCents / 100) * bestMultiplier),
    rewardValueCents: null,
  };

  return {
    verdict: 'OPTIMAL' as EngineDecision['card']['verdict'],
    cardId: bestCard.id,
    cardNickname: bestCard.nickname,
    rewardUnit: rewardSemantics.rewardUnit,
    rewardRate: rewardSemantics.rewardRate,
    rewardPoints: rewardSemantics.rewardPoints,
    rewardValueCents: rewardSemantics.rewardValueCents,
    hasCardData: true,
  };
}

function isMissingNumber(value: number | null | undefined): value is null | undefined {
  return value == null || Number.isNaN(value);
}

function assertRunEngineInput(input: LegacyEngineInput): void {
  if (isMissingNumber(input.amountCents) || input.amountCents < 0) {
    throw new Error('amountCents must be a non-negative integer');
  }
  if (isMissingNumber(input.nowMs)) {
    throw new Error('runEngine requires explicit `nowMs`');
  }
}

function budgetVerdict(
  remainingAfter: number,
  budgetAmount: number
): EngineDecision['budget']['verdict'] {
  if (remainingAfter < 0) return 'BREAKS_BUDGET';
  if (remainingAfter < budgetAmount * 0.1) return 'BORDERLINE';
  return 'HEALTHY';
}

function computeBudgetInfo(
  coverageMode: CategoryCoverageMode,
  freshBuckets: Bucket[],
  amountCents: number
): EngineDecision['budget'] {
  if (coverageMode !== 'BUDGETED' || freshBuckets.length === 0) {
    return { verdict: 'UNCONFIGURED', coverageMode, hasBucket: false };
  }
  // Simple selection: earliest created bucket for the category.
  const target = freshBuckets[0] as Bucket;
  const spendingAfter = target.spentCents + amountCents;
  const remainingAfter = target.budgetAmount - spendingAfter;
  return {
    verdict: budgetVerdict(remainingAfter, target.budgetAmount),
    coverageMode,
    hasBucket: true,
    bucketId: target.id,
    name: target.name,
    limitCents: target.budgetAmount,
    spentBeforeCents: target.spentCents,
    spentAfterCents: spendingAfter,
    remainingAfterCents: remainingAfter,
    strictMode: target.strictMode,
    wouldExceed: remainingAfter < 0,
  };
}

export async function runEngine(input: LegacyEngineInput): Promise<EngineDecision> {
  assertRunEngineInput(input);
  assertPrismaReady(prisma);
  const now = new Date(input.nowMs);

  const category = await resolveCategory({
    mccCode: input.mccCode ?? null,
    category: input.category ?? null,
    merchantName: input.merchantName ?? null,
  });

  const { coverageMode, buckets } = await getCategoryCoverage(input.userId, category);
  const freshBuckets = buckets.map((b) => applyInMemoryRollover(b, now));
  const budgetInfo = computeBudgetInfo(coverageMode, freshBuckets, input.amountCents);

  const cardInfo = await resolveBestCardForTransaction({
    userId: input.userId,
    category,
    amountCents: input.amountCents,
  });

  const overallVerdict = deriveOverallVerdict(budgetInfo.verdict, cardInfo.verdict);
  const cherryIncentive = computeCherryIncentive(input.amountCents, budgetInfo.verdict);

  return {
    category,
    amountCents: input.amountCents,
    budget: budgetInfo,
    card: cardInfo,
    overallVerdict,
    cherryIncentive,
  };
}

export const evaluateTransaction = runEngine;
