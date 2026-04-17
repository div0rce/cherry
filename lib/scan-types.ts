import type { RewardCategory } from '@prisma/client';
import type {
  EngineCapabilityMap,
  EngineDegradedDimensions,
  EngineDegradation,
  LegacyEngineDecision,
  RewardSemantics,
} from './engine.js';
import type { BudgetVerdict, CardVerdict, OverallVerdict } from './enums.js';
import type { SimulatedAuthorityDecision } from './authority/simulateSpendAuthority.js';

export type ScanRequestBody = {
  merchantName: string;
  category?: RewardCategory;
  expectedAmountCents?: number;
  mccCode?: number | null;
};

export type ScanSuccessResponseBody = {
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
    rewardUnit: RewardSemantics['rewardUnit'] | null;
    rewardRate: number | null;
    rewardPoints: number | null;
    rewardValueCents: number | null;
    verdict: CardVerdict;
  };

  budgetVerdict: BudgetVerdict;
  cardVerdict: CardVerdict;
  overallVerdict: OverallVerdict;

  cherryIncentive: {
    pointsIfFollowed: number;
    expiryMinutes: number;
  };

  decision: LegacyEngineDecision;
  capabilities: EngineCapabilityMap;
  degraded: EngineDegradedDimensions;
  degradation: EngineDegradation;
  authority: SimulatedAuthorityDecision | null;
};

export type ScanFallbackResponseBody = {
  error: {
    code: string;
    message: string;
  };
  decision: null;
  capabilities: EngineCapabilityMap;
  degraded: EngineDegradedDimensions;
  degradation: EngineDegradation;
  authority: SimulatedAuthorityDecision | null;
};

export type ScanResponseBody = ScanSuccessResponseBody | ScanFallbackResponseBody;
