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

const FALLBACK_CATEGORY_KEYS: readonly string[] = ['GENERAL_MERCHANDISE', 'OTHER', 'ALL'];

function chooseRewardRule(
  rewardRules: RewardRule[],
  merchantCategoryKey?: string | null
): RewardRule | null {
  const categoryKeys = hasText(merchantCategoryKey)
    ? [merchantCategoryKey, ...FALLBACK_CATEGORY_KEYS]
    : FALLBACK_CATEGORY_KEYS;

  for (const categoryKey of categoryKeys) {
    const rule = rewardRules.find((candidate) => candidate.categoryKey === categoryKey);
    if (rule !== undefined) return rule;
  }

  return null;
}

function isPositiveFiniteAmount(amountCents: number | null | undefined): amountCents is number {
  if (typeof amountCents !== 'number') return false;
  if (!Number.isFinite(amountCents)) return false;
  return amountCents > 0;
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
  card?: Pick<NormalizedCard, 'rewardRules'> | null | undefined;
  amountCents?: number | null | undefined;
  merchantCategoryKey?: string | null | undefined;
}): RewardSemantics | null {
  const { card, amountCents, merchantCategoryKey } = params;

  if (card == null) return null;
  if (!isPositiveFiniteAmount(amountCents)) return null;

  const rewardRule = chooseRewardRule(card.rewardRules, merchantCategoryKey);
  if (rewardRule === null) return null;

  return getRewardSemanticsForRule(amountCents, rewardRule);
}
