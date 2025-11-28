import { RewardCategory } from '@prisma/client';
import type { EngineDecision } from '@/lib/engine';
import type { BudgetVerdict, CardVerdict, OverallVerdict } from '@/lib/enums';

export type ScanRequestBody = {
  merchantName: string;
  category?: RewardCategory;
  expectedAmountCents?: number;
};

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
    coverageMode: string;
    verdict: BudgetVerdict;
  };

  cardRecommendation: {
    cardId: string | null;
    cardNickname: string | null;
    rewardMultiplier: number | null;
    estimatedRewards: number | null;
    verdict: CardVerdict;
  };

  budgetVerdict: BudgetVerdict;
  cardVerdict: CardVerdict;
  overallVerdict: OverallVerdict;

  cherryIncentive: {
    pointsIfFollowed: number;
    expiryMinutes: number;
  };

  engineDecision: EngineDecision;
};
