import { RewardCategory } from '@prisma/client';
import type { EvaluateTransactionResult } from '@/lib/engine';

export type ScanRequestBody = {
  merchantName: string;
  category?: RewardCategory;
  expectedAmountCents?: number;
};

export type SpendingVerdict = 'HEALTHY' | 'BORDERLINE' | 'BREAKS_BUDGET';

export type ScanResponseBody = {
  merchantName: string;
  category: RewardCategory;
  amountCents: number;

  bucket: {
    name: string | null;
    limitCents: number | null;
    spentBeforeCents: number | null;
    spentAfterCents: number | null;
    remainingAfterCents: number | null;
    strictMode: boolean;
    wouldExceed: boolean;
  };

  cardRecommendation: {
    cardId: string | null;
    cardNickname: string | null;
    rewardMultiplier: number | null;
    estimatedRewards: number | null;
  };

  spendingVerdict: SpendingVerdict;

  cherryIncentive: {
    pointsIfFollowed: number;
    expiryMinutes: number;
  };

  engineDecision: EvaluateTransactionResult;
};
