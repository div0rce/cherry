// lib/simulation.ts
// Legacy simulation engine (archived; do not use in runtime paths).
/**
 * LEGACY SIMULATION ENGINE (ARCHIVED)
 *
 * This module predates the canonical engine in lib/engine.ts and its
 * invariants in lib/engine-invariants.ts. It is kept only for historical
 * reference. Do NOT import this module from runtime code (app/api/*, lib/*,
 * scripts/*). All decision logic must use lib/engine.ts and simulations should
 * go through lib/simulation-adapter.ts.
 *
 * TODO(simulation-migration):
 * - Audit any remaining consumers (tests, docs).
 * - Migrate or remove; consider moving this file under legacy/ if kept.
 *
 * See docs/cherry-core-loop-engine-vine-wallet-audit.md §3.
 */

import { PrismaClient, RewardCategory, TransactionStatus } from '@prisma/client';
import type { Bucket, Card, RewardRule, SimulatedTransaction } from '@prisma/client';
import { computeBucketBalanceFromNumbers, deriveLegacyCurrentAmount } from './buckets-runtime';

function hasNonEmptyString(value?: string | null): value is string {
  return value !== undefined && value !== null && value !== '';
}

export interface SimulationInput {
  amountCents: number;
  category?: string; // optional legacy category string
  merchantName?: string;
  mccCode?: number | null;
}

export interface SimulationResult {
  transaction: SimulatedTransaction & {
    chosenCard?: Card | null;
    bucket?: Bucket | null;
  };
}

type CardWithRules = Card & { rewardRules: RewardRule[] };

// Resolve a category using MCC mapping first, then explicit category string, then heuristics.
export async function resolveCategory(
  prisma: PrismaClient,
  input: { mccCode?: number | null; category?: string; merchantName?: string }
): Promise<RewardCategory> {
  const { mccCode, category, merchantName } = input;

  if (mccCode !== null && mccCode !== undefined && Number.isInteger(mccCode)) {
    const mapping = await prisma.mccToRewardCategory.findFirst({
      where: { mccCode, isDefault: true },
    });
    if (mapping !== null) return mapping.category;
  }

  if (hasNonEmptyString(category)) {
    const upper = category.toUpperCase();
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

function scoreRule(rule: RewardRule | null): { score: number; multiplier: number | null; cashback: number | null } {
  if (rule === null) return { score: 1, multiplier: 1, cashback: null };
  if (rule.cashbackPercent != null) {
    return { score: rule.cashbackPercent / 100, multiplier: null, cashback: rule.cashbackPercent };
  }
  if (rule.multiplier != null) {
    return { score: rule.multiplier, multiplier: rule.multiplier, cashback: null };
  }
  return { score: 1, multiplier: 1, cashback: null };
}

async function pickBestCardForCategory(
  prisma: PrismaClient,
  userId: string,
  category: RewardCategory
): Promise<{ card: CardWithRules | null; rule: RewardRule | null }> {
  const cards = await prisma.card.findMany({
    where: { userId },
    include: { rewardRules: true },
  });
  if (cards.length === 0) return { card: null, rule: null };

  let best: CardWithRules | null = null;
  let bestRule: RewardRule | null = null;
  let bestScore = -Infinity;

  for (const card of cards) {
    const rule = card.rewardRules.find((r) => r.category === category) || null;
    const { score } = scoreRule(rule);
    if (score > bestScore) {
      bestScore = score;
      best = card;
      bestRule = rule;
    }
  }

  return { card: best, rule: bestRule };
}

async function pickBucketForCategory(
  prisma: PrismaClient,
  userId: string,
  category: RewardCategory
): Promise<Bucket | null> {
  return prisma.bucket.findFirst({
    where: { userId, category },
    orderBy: { createdAt: 'desc' },
  });
}

function computeRewards(amountCents: number, rule: RewardRule | null) {
  const { multiplier, cashback } = scoreRule(rule);
  if (cashback != null) {
    const cents = Math.round(amountCents * (cashback / 100));
    return { multiplier: null as number | null, cashbackPercent: cashback, rewardsEarnedCents: cents, rewardsEarnedPoints: null };
  }
  // points path
  const effectiveMultiplier = multiplier ?? 1;
  const points = Math.round((amountCents / 100) * effectiveMultiplier);
  return {
    multiplier: effectiveMultiplier,
    cashbackPercent: null as number | null,
    rewardsEarnedCents: null as number | null,
    rewardsEarnedPoints: points,
  };
}

export async function runSimulation(
  prisma: PrismaClient,
  userId: string,
  input: SimulationInput
): Promise<SimulationResult> {
  const { amountCents, category, merchantName, mccCode } = input;

  if (amountCents === null || amountCents === undefined || Number.isNaN(amountCents) || amountCents <= 0) {
    throw new Error('amountCents must be > 0');
  }

  const resolvedCategory = await resolveCategory(prisma, {
    mccCode: mccCode ?? null,
    ...(hasNonEmptyString(category) ? { category } : {}),
    ...(hasNonEmptyString(merchantName) ? { merchantName } : {}),
  });

  const { card, rule } = await pickBestCardForCategory(prisma, userId, resolvedCategory);

  // No card available
  if (card === null) {
    const tx = await prisma.simulatedTransaction.create({
      data: {
        userId,
        amount: amountCents,
        currency: 'USD',
        merchantName: merchantName ?? null,
        mccCode: mccCode ?? null,
        resolvedCategory,
        rewardRuleCategory: null,
        multiplier: null,
        cashbackPercent: null,
        rewardsEarnedCents: 0,
        rewardsEarnedPoints: 0,
        bucketBeforeCents: null,
        bucketAfterCents: null,
        chosenCardId: null,
        bucketId: null,
        status: TransactionStatus.DECLINED,
        reason: 'NO_CARD',
      },
    });
    return { transaction: { ...tx, chosenCard: null, bucket: null } };
  }

  const bucket = await pickBucketForCategory(prisma, userId, resolvedCategory);
  const bucketBalance = bucket
    ? computeBucketBalanceFromNumbers(bucket.budgetAmount, bucket.spentCents ?? 0, 0)
    : null;
  const bucketBefore = bucketBalance?.remainingCents ?? null;

  // strict bucket decline
  if (
    bucket !== null &&
    bucketBalance !== null &&
    bucket.strictMode === true &&
    bucketBalance.remainingCents < amountCents
  ) {
    const tx = await prisma.simulatedTransaction.create({
      data: {
        userId,
        amount: amountCents,
        currency: 'USD',
        merchantName: merchantName ?? null,
        mccCode: mccCode ?? null,
        resolvedCategory,
        rewardRuleCategory: rule?.category ?? null,
        multiplier: null,
        cashbackPercent: null,
        rewardsEarnedCents: 0,
        rewardsEarnedPoints: 0,
        bucketBeforeCents: bucketBefore,
        bucketAfterCents: bucketBefore,
        chosenCardId: null, // treat as not used
        bucketId: bucket.id,
        status: TransactionStatus.DECLINED,
        reason: 'BUCKET_OVER_LIMIT_STRICT',
      },
    });
    return { transaction: { ...tx, chosenCard: null, bucket } };
  }

  // Approved path
  const rewards = computeRewards(amountCents, rule);
  const bucketAfter =
    bucketBalance != null ? Math.max(0, bucketBalance.remainingCents - amountCents) : null;

  const tx = await prisma.$transaction(async (txPrisma) => {
    if (bucket !== null && bucketAfter != null && bucketBalance !== null) {
      const updatedBalance = computeBucketBalanceFromNumbers(
        bucketBalance.limitCents,
        bucketBalance.postedSpendCents + amountCents,
        bucketBalance.pendingSpendCents
      );
      await txPrisma.bucket.update({
        where: { id: bucket.id },
        data: {
          spentCents: updatedBalance.postedSpendCents,
          currentAmount: deriveLegacyCurrentAmount(updatedBalance),
        },
      });
    }

    return txPrisma.simulatedTransaction.create({
      data: {
        userId,
        amount: amountCents,
        currency: 'USD',
        merchantName: merchantName ?? null,
        mccCode: mccCode ?? null,
        resolvedCategory,
        rewardRuleCategory: rule?.category ?? null,
        multiplier: rewards.multiplier,
        cashbackPercent: rewards.cashbackPercent,
        rewardsEarnedCents: rewards.rewardsEarnedCents,
        rewardsEarnedPoints: rewards.rewardsEarnedPoints,
        bucketBeforeCents: bucketBefore,
        bucketAfterCents: bucketAfter,
        chosenCardId: card.id,
        bucketId: bucket?.id ?? null,
        status: TransactionStatus.APPROVED,
        reason: bucket && bucket.strictMode ? 'OK' : bucket ? 'INSUFFICIENT_BUCKET_BALANCE' : 'NO_BUCKET',
      },
    });
  });

  return { transaction: { ...tx, chosenCard: card, bucket } };
}
/**
 * LEGACY SIMULATION ENGINE
 *
 * This module predates the canonical engine in lib/engine.ts and invariants in
 * lib/engine-invariants.ts. New logic and consumers MUST use lib/engine.ts
 * instead.
 *
 * TODO(simulation-migration):
 * - Audit consumers of this module.
 * - Migrate them to lib/engine.ts or move this file under a legacy/ archive.
 *
 * See docs/cherry-core-loop-engine-vine-wallet-audit.md §3.
 */
