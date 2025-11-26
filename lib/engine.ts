// lib/engine.ts
// Deterministic transaction decision engine: bucket impact + card routing + rewards.

import { prisma } from '@/lib/prisma';
import { RewardCategory, BucketPeriod } from '@prisma/client';

export type EvaluateTransactionInput = {
  userId: string;
  amountCents: number;
  category: RewardCategory;
  merchantName?: string | null;
  now?: Date;
};

export type EvaluateTransactionResult = {
  bucket: {
    id: string | null;
    name: string | null;
    period: BucketPeriod | null;
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
};

function getPeriodWindow(period: BucketPeriod, now: Date): { start: Date; end: Date } {
  const start = new Date(now);
  const end = new Date(now);

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

async function resolveBucketForTransaction(input: EvaluateTransactionInput) {
  const now = input.now ?? new Date();

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
      wouldExceed: false,
      strictDecline: false,
      remainingBeforeCents: null,
      remainingAfterCents: null,
    };
  }

  const { start, end } = getPeriodWindow(bucket.period, now);

  const aggregate = await prisma.simulatedTransaction.aggregate({
    _sum: {
      amount: true,
    },
    where: {
      userId: input.userId,
      bucketId: bucket.id,
      createdAt: {
        gte: start,
        lt: end,
      },
    },
  });

  const spentThisPeriodCents = aggregate._sum.amount ?? 0;
  const willBeSpentCents = spentThisPeriodCents + input.amountCents;

  const wouldExceed = willBeSpentCents > bucket.budgetAmount;
  const strictDecline = bucket.strictMode && wouldExceed;

  const remainingBeforeCents = bucket.budgetAmount - spentThisPeriodCents;
  const remainingAfterCents = bucket.budgetAmount - willBeSpentCents;

  return {
    bucket,
    spentThisPeriodCents,
    wouldExceed,
    strictDecline,
    remainingBeforeCents,
    remainingAfterCents,
  };
}

async function resolveBestCardForTransaction(input: EvaluateTransactionInput) {
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

export async function evaluateTransaction(
  input: EvaluateTransactionInput
): Promise<EvaluateTransactionResult> {
  const {
    bucket,
    spentThisPeriodCents,
    wouldExceed,
    strictDecline,
    remainingBeforeCents,
    remainingAfterCents,
  } = await resolveBucketForTransaction(input);

  const { chosenCard, rewardMultiplier, rewardsEarned } =
    await resolveBestCardForTransaction(input);

  const willBeSpentCents =
    spentThisPeriodCents !== null ? spentThisPeriodCents + input.amountCents : null;

  return {
    bucket: {
      id: bucket?.id ?? null,
      name: bucket?.name ?? null,
      period: bucket?.period ?? null,
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
  };
}
