// lib/engine.ts
// Deterministic transaction decision engine: bucket impact + card routing + rewards + incentive.

import { prisma } from '@/lib/prisma';
import {
  BucketPeriod,
  RecommendationVerdict,
  RewardCategory,
} from '@prisma/client';

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
  bucket: {
    id: string | null;
    name: string | null;
    period: BucketPeriod | null;
    periodStart: Date | null;
    periodEnd: Date | null;
    limitCents: number | null;
    spentThisPeriodCents: number | null;
    willBeSpentCents: number | null;
    remainingBeforeCents: number | null;
    remainingAfterCents: number | null;
    wouldExceed: boolean;
    strictDecline: boolean;
  };
  routing: {
    chosenCardId: string | null;
    chosenCardName: string | null;
    rewardMultiplier: number | null;
    rewardsEarned: number | null;
  };
  verdict: RecommendationVerdict;
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

function getPeriodWindow(period: BucketPeriod, anchor: Date): { start: Date; end: Date } {
  const start = new Date(anchor);
  const end = new Date(anchor);

  if (period === 'WEEKLY') {
    const day = start.getDay();
    const diffToMonday = (day + 6) % 7;
    start.setDate(start.getDate() - diffToMonday);
    start.setHours(0, 0, 0, 0);

    end.setDate(start.getDate() + 7);
    end.setHours(0, 0, 0, 0);
  } else if (period === 'MONTHLY') {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);

    end.setMonth(start.getMonth() + 1);
    end.setDate(1);
    end.setHours(0, 0, 0, 0);
  } else {
    start.setFullYear(1970, 0, 1);
    start.setHours(0, 0, 0, 0);

    end.setFullYear(3000, 0, 1);
    end.setHours(0, 0, 0, 0);
  }

  return { start, end };
}

async function resolveBucketForTransaction(input: {
  userId: string;
  category: RewardCategory;
  amountCents: number;
  now: Date;
}) {
  const bucket = await prisma.bucket.findFirst({
    where: {
      userId: input.userId,
      category: input.category,
    },
  });

  if (!bucket) {
    return {
      bucket: null,
      spentThisPeriodCents: null,
      willBeSpentCents: null,
      wouldExceed: false,
      strictDecline: false,
      remainingBeforeCents: null,
      remainingAfterCents: null,
      periodStart: null,
      periodEnd: null,
    };
  }

  // Use stored period bounds but fall back to computed window for sanity.
  const periodStart = bucket.periodStart ?? getPeriodWindow(bucket.period, input.now).start;
  const periodEnd = bucket.periodEnd ?? getPeriodWindow(bucket.period, input.now).end;

  const spentThisPeriodCents = bucket.spentCents ?? 0;
  const willBeSpentCents = spentThisPeriodCents + input.amountCents;
  const wouldExceed = willBeSpentCents > bucket.budgetAmount;
  const strictDecline = bucket.strictMode && wouldExceed;
  const remainingBeforeCents = bucket.budgetAmount - spentThisPeriodCents;
  const remainingAfterCents = bucket.budgetAmount - willBeSpentCents;

  return {
    bucket,
    spentThisPeriodCents,
    willBeSpentCents,
    wouldExceed,
    strictDecline,
    remainingBeforeCents,
    remainingAfterCents,
    periodStart,
    periodEnd,
  };
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
      chosenCard: null,
      rewardMultiplier: null,
      rewardsEarned: null,
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
      chosenCard: null,
      rewardMultiplier: null,
      rewardsEarned: null,
    };
  }

  const rewardsEarned = Math.floor((input.amountCents * bestMultiplier) / 100);

  return {
    chosenCard: bestCard,
    rewardMultiplier: bestMultiplier,
    rewardsEarned,
  };
}

export function classifySpendingVerdict(decision: EngineDecision): RecommendationVerdict {
  const b = decision.bucket;

  if (!b.id || b.limitCents == null || b.willBeSpentCents == null) {
    return RecommendationVerdict.HEALTHY;
  }

  const overBy = b.willBeSpentCents - b.limitCents;

  if (b.strictDecline || overBy > 0) {
    return RecommendationVerdict.BREAKS_BUDGET;
  }

  if (b.remainingAfterCents != null && b.limitCents > 0) {
    const ratio = b.remainingAfterCents / b.limitCents;
    if (ratio < 0.1) return RecommendationVerdict.BORDERLINE;
  }

  return RecommendationVerdict.HEALTHY;
}

export function computeCherryIncentive(
  decision: EngineDecision
): { pointsIfFollowed: number; expiryMinutes: number } {
  const amount = decision.bucket.willBeSpentCents ?? decision.amountCents ?? 0;
  const base = Math.min(Math.floor(amount / 1000), 20); // 0-20 base points

  let multiplier = 1;
  if (decision.verdict === RecommendationVerdict.HEALTHY) multiplier = 2;
  else if (decision.verdict === RecommendationVerdict.BREAKS_BUDGET) multiplier = 0;

  const points = base * multiplier;

  return {
    pointsIfFollowed: points,
    expiryMinutes: 15,
  };
}

export async function runEngine(input: EngineInput): Promise<EngineDecision> {
  if (!input.amountCents || input.amountCents <= 0) {
    throw new Error('amountCents must be a positive integer');
  }

  const now = input.now ?? new Date();
  const category = await resolveCategory({
    mccCode: input.mccCode,
    category: input.category,
    merchantName: input.merchantName,
  });

  const {
    bucket,
    spentThisPeriodCents,
    willBeSpentCents,
    wouldExceed,
    strictDecline,
    remainingBeforeCents,
    remainingAfterCents,
    periodStart,
    periodEnd,
  } = await resolveBucketForTransaction({
    userId: input.userId,
    category,
    amountCents: input.amountCents,
    now,
  });

  const { chosenCard, rewardMultiplier, rewardsEarned } = await resolveBestCardForTransaction({
    userId: input.userId,
    category,
    amountCents: input.amountCents,
  });

  const decision: EngineDecision = {
    category,
    amountCents: input.amountCents,
    bucket: {
      id: bucket?.id ?? null,
      name: bucket?.name ?? null,
      period: bucket?.period ?? null,
      periodStart,
      periodEnd,
      limitCents: bucket?.budgetAmount ?? null,
      spentThisPeriodCents,
      willBeSpentCents,
      remainingBeforeCents,
      remainingAfterCents,
      wouldExceed,
      strictDecline,
    },
    routing: {
      chosenCardId: chosenCard?.id ?? null,
      chosenCardName: chosenCard?.nickname ?? null,
      rewardMultiplier,
      rewardsEarned,
    },
    verdict: RecommendationVerdict.HEALTHY, // overwritten below
    cherryIncentive: {
      pointsIfFollowed: 0,
      expiryMinutes: 15,
    },
  };

  decision.verdict = classifySpendingVerdict(decision);
  decision.cherryIncentive = computeCherryIncentive(decision);

  return decision;
}

// Legacy compatibility exports
export type EvaluateTransactionResult = EngineDecision;
export const evaluateTransaction = runEngine;
