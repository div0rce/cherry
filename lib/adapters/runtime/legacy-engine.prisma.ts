// Legacy engine entrypoint retained for compatibility with existing flows.
// New code should prefer the typed solver in lib/engine/solver.
import { prisma } from '../../prisma';
import { RewardCategory } from '@prisma/client';
import type { Bucket } from '@prisma/client';
import { applyInMemoryRollover } from '../../buckets/periods';
import type {
  CategoryCoverageMode,
  EngineDecision,
  EngineInput,
} from '../../legacy-engine-types';

export type {
  CategoryCoverageMode,
  EngineDecision,
  EngineInput,
  EvaluateTransactionResult,
} from '../../legacy-engine-types';

export async function resolveCategory(input: {
  mccCode?: number | null;
  category?: string | RewardCategory | null;
  merchantName?: string | null;
}): Promise<RewardCategory> {
  const { mccCode, category, merchantName } = input;

  if (mccCode !== null && mccCode !== undefined && Number.isInteger(mccCode)) {
    const mapping = await prisma.mccToRewardCategory.findFirst({
      where: { mccCode, isDefault: true },
    });
    if (mapping) return mapping.category;
  }

  if (category !== null && category !== undefined && category !== '') {
    const upper = String(category).trim().toUpperCase();
    if ((Object.values(RewardCategory) as string[]).includes(upper)) {
      return upper as RewardCategory;
    }
  }

  const merchant = merchantName?.toLowerCase() ?? '';
  if (/air|flight|airline|airport/.test(merchant)) return RewardCategory.AIR_TRAVEL;
  if (/hotel|inn|motel|resort|lodge/.test(merchant)) return RewardCategory.HOTEL;
  if (/uber|lyft|taxi|ride/.test(merchant)) return RewardCategory.TRAVEL;
  if (/grocery|market|supermarket/.test(merchant)) return RewardCategory.GROCERIES;
  if (/restaurant|diner|cafe|food|grill|bbq|pizza|burger/.test(merchant))
    return RewardCategory.DINING;
  if (/gas|fuel|petro|shell|exxon|chevron|bp/.test(merchant)) return RewardCategory.GAS;
  if (/stream|subscription|netflix|spotify|hulu|disney|apple tv/.test(merchant))
    return RewardCategory.ENTERTAINMENT;
  return RewardCategory.OTHER;
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

  if (pref && pref.mode === 'UNBUDGETED') {
    return { coverageMode: 'UNBUDGETED_INTENTIONAL', buckets: [] };
  }

  return { coverageMode: 'UNCONFIGURED', buckets: [] };
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
    const exactRule = card.rewardRules.find((r) => r.category === input.category);
    const fallbackRule = card.rewardRules.find(
      (r) =>
        r.category === RewardCategory.GENERAL_MERCHANDISE ||
        r.category === RewardCategory.OTHER
    );

    const rule = exactRule ?? fallbackRule;
    const multiplier = rule?.multiplier ?? 1;

    if (
      multiplier > bestMultiplier ||
      (multiplier === bestMultiplier && bestCard && card.id < bestCard.id)
    ) {
      bestCard = card;
      bestMultiplier = multiplier;
    }
  }

  if (!bestCard) {
    return {
      verdict: 'NO_CARD_DATA' as EngineDecision['card']['verdict'],
      hasCardData: false,
    };
  }

  const estimatedRewards = Math.floor((input.amountCents * bestMultiplier) / 100);

  return {
    verdict: 'OPTIMAL' as EngineDecision['card']['verdict'],
    cardId: bestCard.id,
    cardNickname: bestCard.nickname,
    multiplier: bestMultiplier,
    estimatedRewards,
    hasCardData: true,
  };
}

export async function runEngine(input: EngineInput): Promise<EngineDecision> {
  if (input.amountCents == null || Number.isNaN(input.amountCents) || input.amountCents < 0) {
    throw new Error('amountCents must be a non-negative integer');
  }

  if (input.nowMs == null || Number.isNaN(input.nowMs)) {
    throw new Error('runEngine requires explicit `nowMs`');
  }
  const now = new Date(input.nowMs);

  const category = await resolveCategory({
    mccCode: input.mccCode ?? null,
    category: input.category ?? null,
    merchantName: input.merchantName ?? null,
  });

  const { coverageMode, buckets } = await getCategoryCoverage(input.userId, category);
  const freshBuckets = buckets.map((b) => applyInMemoryRollover(b, now));

  let budgetInfo: EngineDecision['budget'] = {
    verdict: 'UNCONFIGURED',
    coverageMode,
    hasBucket: false,
  };

  if (coverageMode === 'BUDGETED' && freshBuckets.length > 0) {
    // Simple selection: earliest created bucket for the category.
    const target = freshBuckets[0] as Bucket;
    const spendingAfter = target.spentCents + input.amountCents;
    const remainingAfter = target.budgetAmount - spendingAfter;
    const wouldExceed = remainingAfter < 0;

    const verdict =
      remainingAfter < 0
        ? 'BREAKS_BUDGET'
        : remainingAfter < target.budgetAmount * 0.1
          ? 'BORDERLINE'
          : 'HEALTHY';

    budgetInfo = {
      verdict,
      coverageMode,
      hasBucket: true,
      bucketId: target.id,
      name: target.name,
      limitCents: target.budgetAmount,
      spentBeforeCents: target.spentCents,
      spentAfterCents: spendingAfter,
      remainingAfterCents: remainingAfter,
      strictMode: target.strictMode,
      wouldExceed,
    };
  }

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
