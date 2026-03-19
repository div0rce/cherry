import type { RewardCategory } from '@prisma/client';
import type { BudgetVerdict, CardVerdict, OverallVerdict } from './enums.js';
import type { RewardSemantics } from './engine/reward-semantics.js';

export type CategoryCoverageMode = 'BUDGETED' | 'UNBUDGETED_INTENTIONAL' | 'UNCONFIGURED';

export type LegacyEngineInput = {
  userId: string;
  amountCents: number;
  category?: RewardCategory | string | null;
  merchantName?: string | null;
  mccCode?: number | null;
  nowMs: number;
};

export type EngineDecision = {
  category: RewardCategory;
  amountCents: number;
  budget: {
    verdict: BudgetVerdict;
    coverageMode: CategoryCoverageMode;
    hasBucket: boolean;
    bucketId?: string;
    name?: string;
    limitCents?: number;
    spentBeforeCents?: number;
    spentAfterCents?: number;
    remainingAfterCents?: number;
    strictMode?: boolean;
    wouldExceed?: boolean;
  };
  card: {
    verdict: CardVerdict;
    cardId?: string;
    cardNickname?: string;
    rewardUnit?: RewardSemantics['rewardUnit'] | null;
    rewardRate?: number | null;
    rewardPoints?: number | null;
    rewardValueCents?: number | null;
    hasCardData: boolean;
  };
  overallVerdict: OverallVerdict;
  cherryIncentive: {
    pointsIfFollowed: number;
    expiryMinutes: number;
  };
};

export type EvaluateTransactionResult = EngineDecision;
