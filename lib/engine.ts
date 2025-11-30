// lib/engine.ts
// Deterministic transaction decision engine with budget/card/overall verdicts and coverage modes.

import { prisma } from '@/lib/prisma';
import { Bucket, RewardCategory } from '@prisma/client';
import type { BudgetVerdict, CardVerdict, OverallVerdict } from '@/lib/enums';
import { applyInMemoryRollover } from '@/lib/buckets/periods';

export type CategoryCoverageMode = 'BUDGETED' | 'UNBUDGETED_INTENTIONAL' | 'UNCONFIGURED';

export type EngineInput = {
  userId: string;
  amountCents: number;
  category?: RewardCategory | string | null;
  merchantName?: string | null;
  mccCode?: number | null;
  now?: Date;
};

export type EngineDecision = {
  category: RewardCategory;
  amountCents: number;
  budget: {
    verdict: BudgetVerdict;
    coverageMode: CategoryCoverageMode;
    hasBucket: boolean;
    bucketId?: string;
    name?: string;
    limitCents?: number;
    spentBeforeCents?: number;
    spentAfterCents?: number;
    remainingAfterCents?: number;
    strictMode?: boolean;
    wouldExceed?: boolean;
  };
  card: {
    verdict: CardVerdict;
    cardId?: string;
    cardNickname?: string;
    multiplier?: number;
    estimatedRewards?: number;
    hasCardData: boolean;
  };
  overallVerdict: OverallVerdict;
  cherryIncentive: {
    pointsIfFollowed: number;
    expiryMinutes: number;
  };
};

export async function resolveCategory(input: {
  mccCode?: number | null;
  category?: string | RewardCategory | null;
  merchantName?: string | null;
}): Promise<RewardCategory> {
  const { mccCode, category, merchantName } = input;

  if (mccCode && Number.isInteger(mccCode)) {
    const mapping = await prisma.mccToRewardCategory.findFirst({
      where: { mccCode, isDefault: true },
    });
    if (mapping) return mapping.category;
  }

  if (category) {
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

function deriveOverallVerdict(budget: BudgetVerdict, card: CardVerdict): OverallVerdict {
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

function computeCherryIncentive(amountCents: number, budgetVerdict: BudgetVerdict): {
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

  if (!cards.length) {
    return {
      verdict: 'NO_CARD_DATA' as CardVerdict,
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
      verdict: 'NO_CARD_DATA' as CardVerdict,
      hasCardData: false,
    };
  }

  const estimatedRewards = Math.floor((input.amountCents * bestMultiplier) / 100);

  return {
    verdict: 'OPTIMAL' as CardVerdict,
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

  const now = input.now ?? new Date();

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
    const bucket = freshBuckets[0];
    if (bucket) {
      const limitCents = bucket.budgetAmount;
      const spentBefore = bucket.spentCents ?? 0;
      const spentAfter = spentBefore + input.amountCents;
      const remainingAfter = limitCents - spentAfter;
      const wouldExceed = spentAfter > limitCents;

      let verdict: BudgetVerdict = 'HEALTHY';
      if (wouldExceed) verdict = 'BREAKS_BUDGET';
      else if (limitCents > 0 && remainingAfter / limitCents < 0.1) verdict = 'BORDERLINE';

      budgetInfo = {
        verdict,
        coverageMode,
        hasBucket: true,
        bucketId: bucket.id,
        name: bucket.name,
        limitCents,
        spentBeforeCents: spentBefore,
        spentAfterCents: spentAfter,
        remainingAfterCents: remainingAfter,
        strictMode: bucket.strictMode,
        wouldExceed,
      };
    }
  } else if (coverageMode === 'UNBUDGETED_INTENTIONAL') {
    budgetInfo = {
      verdict: 'UNBOUNDED',
      coverageMode,
      hasBucket: false,
    };
  } else {
    budgetInfo = {
      verdict: 'UNCONFIGURED',
      coverageMode,
      hasBucket: false,
    };
  }

  const cardInfo = await resolveBestCardForTransaction({
    userId: input.userId,
    category,
    amountCents: input.amountCents,
  });

  const hasAnyBucket = coverageMode === 'BUDGETED';
  const hasAnyCard = cardInfo.hasCardData === true;

  if (!hasAnyBucket && !hasAnyCard) {
    return {
      category,
      amountCents: input.amountCents,
      budget: {
        verdict: 'UNCONFIGURED',
        coverageMode,
        hasBucket: false,
      },
      card: {
        verdict: 'NO_CARD_DATA',
        hasCardData: false,
      },
      overallVerdict: 'INSUFFICIENT_DATA',
      cherryIncentive: {
        pointsIfFollowed: 0,
        expiryMinutes: 0,
      },
    };
  }

  const overallVerdict = deriveOverallVerdict(budgetInfo.verdict, cardInfo.verdict);
  const incentive = computeCherryIncentive(input.amountCents, budgetInfo.verdict);

  return {
    category,
    amountCents: input.amountCents,
    budget: budgetInfo,
    card: cardInfo,
    overallVerdict,
    cherryIncentive: incentive,
  };
}

// Legacy compatibility exports
export type EvaluateTransactionResult = EngineDecision;
export const evaluateTransaction = runEngine;
