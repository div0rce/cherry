import type { BucketPeriod, RewardCategory } from '@prisma/client';

export type AutopilotOnboardingState = 'EMPTY' | 'NEED_RULES' | 'NEED_BUCKETS' | 'READY';

export type PrereqCard = {
  id: string;
  nickname: string;
  issuer: string;
  network: string;
  rewardRuleCount: number;
};

export type PrereqBucket = {
  id: string;
  name: string;
  category: RewardCategory;
  budgetAmount: number;
  period: BucketPeriod;
};

export type AutopilotPrereqs = {
  cardsCount: number;
  rulesCount: number;
  bucketsCount: number;
  cards: PrereqCard[];
  buckets: PrereqBucket[];
  hasBaseRule: boolean;
  state: AutopilotOnboardingState;
  warnings: string[];
};

export function getFirstMissingPrereq(
  prereqs: Pick<AutopilotPrereqs, 'cardsCount' | 'rulesCount' | 'bucketsCount'>
): 'cards' | 'rules' | 'buckets' | null {
  if (prereqs.cardsCount <= 0) return 'cards';
  if (prereqs.rulesCount <= 0) return 'rules';
  if (prereqs.bucketsCount <= 0) return 'buckets';
  return null;
}
