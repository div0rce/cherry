// Canonical Cherry engine type definitions.
// These types are intentionally decoupled from Prisma and React so the engine
// can run in isolation and be reused across surfaces.

export type EngineSurface =
  | 'web'
  | 'extension'
  | 'vine'
  | 'wallet_pass'
  | 'watch'
  | 'sms'
  | 'unknown';

export type EngineBucketSnapshot = {
  id: string;
  name: string;
  categoryKey: string;
  limitCents: number | null;
  balanceCents: number;
  period: 'MONTHLY' | 'WEEKLY' | 'ADHOC';
};

export type EngineDebtSnapshot = {
  id: string;
  name: string;
  type: 'CREDIT_CARD' | 'LOAN' | 'OTHER';
  balanceCents: number;
  creditLimitCents: number | null;
  aprPercent: number | null;
  utilization: number | null;
};

export type EngineCashSnapshot = {
  liquidCents: number | null;
  nextPaycheckDate: Date | null;
  nextPaycheckNetCents: number | null;
};

export type EngineCardRewardRule = {
  categoryKey: string;
  rateType: 'CASHBACK' | 'POINTS_PER_DOLLAR';
  rateValue: number;
  capAmountCents?: number | null;
  capPeriod?: 'MONTHLY' | 'QUARTERLY' | 'YEARLY' | null;
  promoStart?: Date | null;
  promoEnd?: Date | null;
  confidence: number;
  source: 'STATIC_CONFIG' | 'SCRAPE_LLM' | 'INFERRED_FROM_TXN' | 'USER_OVERRIDE';
};

export type EngineCard = {
  id: string;
  issuer: string;
  label: string;
  last4?: string;
  network?: 'VISA' | 'MASTERCARD' | 'AMEX' | 'DISCOVER' | 'OTHER';
  productSlug?: string | null;
  rewards: EngineCardRewardRule[];
  isCredit: boolean;
  canUseForContext: boolean;
};

export type EngineUserPreferences = {
  rewardsWeight: number;
  runwayWeight: number;
  debtReliefWeight: number;
  volatilityPenaltyWeight: number;
  ruleViolationPenaltyWeight: number;
};

export type EngineUserState = {
  userId: string;
  buckets: EngineBucketSnapshot[];
  debts: EngineDebtSnapshot[];
  cash: EngineCashSnapshot;
  cards: EngineCard[];
  preferences: EngineUserPreferences;
};

export type EngineContext = {
  surface: EngineSurface;
  now: Date;
  merchantName?: string | null;
  merchantDomain?: string | null;
  merchantCategoryKey?: string | null;
  mcc?: string | null;
  amountCents?: number | null;
  locationCity?: string | null;
  locationCountry?: string | null;
  payPeriodDayOfCycle?: number | null;
};

export type EngineActionType =
  | 'USE_CARD'
  | 'DELAY_PURCHASE'
  | 'REJECT_PURCHASE'
  | 'SWITCH_MERCHANT'
  | 'ADJUST_BUDGET'
  | 'PAY_DOWN_DEBT';

export type EngineAction = {
  type: EngineActionType;
  id: string;
  cardId?: string;
  delayDays?: number;
  altMerchantName?: string;
  altMerchantCategoryKey?: string;
  budgetAdjustments?: { bucketId: string; deltaCents: number }[];
  debtPayment?: { debtId: string; amountCents: number };
};

export type ObjectiveComponentScores = {
  rewards: number;
  runway: number;
  debtRelief: number;
  volatilityPenalty: number;
  ruleViolationPenalty: number;
};

export type ObjectiveWeights = {
  rewards: number;
  runway: number;
  debtRelief: number;
  volatilityPenalty: number;
  ruleViolationPenalty: number;
};

export type EngineDecision = {
  action: EngineAction;
  score: number;
  components: ObjectiveComponentScores;
  constraintsBreached: string[];
  projections: {
    buckets?: EngineBucketSnapshot[];
    debts?: EngineDebtSnapshot[];
    cash?: EngineCashSnapshot;
  };
  explanationBullets: string[];
};

export type EngineConstraintSeverity = 'HARD' | 'SOFT';

export type EngineConstraint = {
  id: string;
  description: string;
  severity: EngineConstraintSeverity;
};

export type EngineValidationIssue = {
  field: string;
  message: string;
};

export type EngineDecisionTrace = {
  engineVersion: string;
  weights: ObjectiveWeights;
  stateSummary: {
    bucketCount: number;
    cardCount: number;
    debtCount: number;
  };
  contextSummary: {
    surface: EngineSurface;
    merchantCategoryKey?: string | null;
    amountCents?: number | null;
  };
  candidates: {
    action: EngineAction;
    components: ObjectiveComponentScores;
    score: number;
    constraintsBreached: string[];
  }[];
};
