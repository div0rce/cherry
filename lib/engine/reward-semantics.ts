import type { NormalizedCard, RewardRule } from './types.js';

export type RewardSemantics = {
  rewardUnit: 'cashback_cents' | 'issuer_points';
  rewardRate: number;
  rewardPoints: number | null;
  rewardValueCents: number | null;
};

function hasText(value?: string | null): value is string {
  return value !== undefined && value !== null && value !== '';
}

function chooseRewardRule(
  rewardRules: RewardRule[],
  merchantCategoryKey?: string | null
): RewardRule | null {
  const preferredCategoryKey = hasText(merchantCategoryKey) ? merchantCategoryKey : null;
  const fallbackCategoryKeys = ['GENERAL_MERCHANDISE', 'OTHER', 'ALL'];

  if (preferredCategoryKey !== null) {
    const direct = rewardRules.find((rule) => rule.categoryKey === preferredCategoryKey);
    if (direct !== undefined) return direct;
  }

  for (const categoryKey of fallbackCategoryKeys) {
    const fallback = rewardRules.find((rule) => rule.categoryKey === categoryKey);
    if (fallback !== undefined) return fallback;
  }

  return null;
}

export function getRewardSemanticsForRule(
  amountCents: number,
  rewardRule: Pick<RewardRule, 'rateType' | 'rateValue'>
): RewardSemantics {
  const centsPerDollar = 100;
  if (rewardRule.rateType === 'CASHBACK') {
    return {
      rewardUnit: 'cashback_cents',
      rewardRate: rewardRule.rateValue,
      rewardPoints: null,
      rewardValueCents: Math.max(0, Math.floor(amountCents * rewardRule.rateValue)),
    };
  }

  return {
    rewardUnit: 'issuer_points',
    rewardRate: rewardRule.rateValue,
    rewardPoints: Math.max(
      0,
      Math.floor((amountCents * rewardRule.rateValue) / centsPerDollar)
    ),
    rewardValueCents: null,
  };
}

export function getRewardSemanticsForCardSpend(params: {
  card?: Pick<NormalizedCard, 'rewardRules'> | null;
  amountCents?: number | null;
  merchantCategoryKey?: string | null;
}): RewardSemantics | null {
  const { card, amountCents, merchantCategoryKey } = params;

  if (card == null) return null;
  if (typeof amountCents !== 'number' || !Number.isFinite(amountCents) || amountCents <= 0) {
    return null;
  }

  const rewardRule = chooseRewardRule(card.rewardRules, merchantCategoryKey);
  if (rewardRule === null) return null;

  return getRewardSemanticsForRule(amountCents, rewardRule);
}
