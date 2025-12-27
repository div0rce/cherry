import { RewardCategory } from '@prisma/client';
import type { LegacyEngineDecision } from './engine';
import type { BudgetVerdict, CardVerdict, OverallVerdict } from './enums';
import type { SimulatedAuthorityDecision } from './authority/simulateSpendAuthority';

export type ScanRequestBody = {
  merchantName: string;
  category?: RewardCategory;
  expectedAmountCents?: number;
  mccCode?: number | null;
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

  engineDecision: LegacyEngineDecision;
  authority: SimulatedAuthorityDecision;
};
