import { RewardCategory } from '@prisma/client';
import { prisma } from '../../prisma.js';
import { assertUserId } from '../../invariants.js';
import type { AutopilotPrereqs, AutopilotOnboardingState } from '../../autopilot/prereq-types.js';
import { assertPrismaReady } from '../assert-prisma-ready.js';

function deriveState(counts: {
  cardsCount: number;
  rulesCount: number;
  bucketsCount: number;
}): AutopilotOnboardingState {
  if (counts.cardsCount <= 0) return 'EMPTY';
  if (counts.rulesCount <= 0) return 'NEED_RULES';
  if (counts.bucketsCount <= 0) return 'NEED_BUCKETS';
  return 'READY';
}

function buildWarnings(
  counts: { cardsCount: number; bucketsCount: number },
  hasBaseRule: boolean
): string[] {
  const warnings: string[] = [];
  if (counts.cardsCount === 1) {
    warnings.push('Only one card is configured; Autopilot recommendations will be trivial.');
  }
  if (!hasBaseRule) {
    warnings.push('No base reward rule found; uncategorized spend may fall back to 0% rewards.');
  }
  if (counts.bucketsCount === 1) {
    warnings.push('Only one bucket is configured; bucket guardrails may be less informative.');
  }
  return warnings;
}

export async function getAutopilotPrereqs(userId: string): Promise<AutopilotPrereqs> {
  assertUserId(userId, 'getAutopilotPrereqs');
  assertPrismaReady(prisma);

  const [cardsCount, rulesCount, bucketsCount, baseRuleCount, cards, buckets] = await Promise.all([
    prisma.card.count({ where: { userId } }),
    prisma.rewardRule.count({ where: { card: { userId } } }),
    prisma.bucket.count({ where: { userId } }),
    prisma.rewardRule.count({
      where: { card: { userId }, category: RewardCategory.OTHER },
    }),
    prisma.card.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        nickname: true,
        issuer: true,
        network: true,
        _count: { select: { rewardRules: true } },
      },
    }),
    prisma.bucket.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        name: true,
        category: true,
        budgetAmount: true,
        period: true,
      },
    }),
  ]);

  const state = deriveState({ cardsCount, rulesCount, bucketsCount });
  const hasBaseRule = baseRuleCount > 0;
  const warnings = buildWarnings({ cardsCount, bucketsCount }, hasBaseRule);

  return {
    cardsCount,
    rulesCount,
    bucketsCount,
    cards: cards.map((card) => ({
      id: card.id,
      nickname: card.nickname,
      issuer: card.issuer,
      network: card.network,
      rewardRuleCount: card._count.rewardRules,
    })),
    buckets: buckets.map((bucket) => ({
      id: bucket.id,
      name: bucket.name,
      category: bucket.category,
      budgetAmount: bucket.budgetAmount,
      period: bucket.period,
    })),
    hasBaseRule,
    state,
    warnings,
  };
}
