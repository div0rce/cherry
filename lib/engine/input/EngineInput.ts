import type {
  EngineObjectiveProfileId,
  EngineSurface,
  ObjectiveWeights,
} from '../types.js';

import { engineInputVersion } from '../version.js';
export { engineInputVersion };

export type EngineInputWeights = {
  rewards: number | null;
  runway: number | null;
  debtRelief: number | null;
  volatility: number | null;
  ruleViolations: number | null;
};

export type EngineInputCardRewardRule = {
  categoryKey: string;
  rateType: 'CASHBACK' | 'POINTS_PER_DOLLAR';
  rateValue: number;
};

export type EngineInputCard = {
  id: string;
  isActive: boolean;
  isCredit: boolean;
  rewardRules: EngineInputCardRewardRule[];
};

export type EngineInputBucket = {
  id: string;
  categoryKey: string;
  limitCents: number | null;
  postedSpendCents: number;
  pendingSpendCents: number;
  isEssential: boolean;
  strictMode: boolean;
};

export type EngineInputDebt = {
  id: string;
  type: 'CREDIT_CARD' | 'LOAN' | 'OTHER';
  balanceCents: number;
  creditLimitCents: number | null;
  aprPercent: number;
};

export type EngineInputDebtCardLink = {
  cardId: string;
  debtId: string;
};

export type EngineInput = {
  __version: typeof engineInputVersion;
  request: {
    surface: EngineSurface;
    amountCents: number;
    merchantCategoryKey: string | null;
  };
  balances: {
    cash: {
      liquidCents: number | null;
    };
  };
  buckets: EngineInputBucket[];
  debts: EngineInputDebt[];
  debtCardLinks: EngineInputDebtCardLink[];
  cards: EngineInputCard[];
  constraints: {
    hard: {
      maxCardUtilization: number | null;
    };
  };
  preferences: {
    profileId: EngineObjectiveProfileId;
    customWeights: EngineInputWeights | null;
  };
  solver: {
    maxCandidates: number | null;
    weightsOverride: EngineInputWeights | null;
  };
};

export type LegacyWeightsOverride = Partial<ObjectiveWeights> | null;
