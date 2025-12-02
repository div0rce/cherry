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

export type NormalizedCardId = string;
export type BucketId = string;
export type DebtAccountId = string;

export type RewardRule = {
  id: string;
  cardId: NormalizedCardId;
  categoryKey: string;
  mccPattern?: string | null;
  rateType: 'CASHBACK' | 'POINTS_PER_DOLLAR';
  rateValue: number;
  capAmountCents?: number | null;
  capPeriod?: 'MONTHLY' | 'QUARTERLY' | 'YEARLY' | null;
  promoStart?: Date | null;
  promoEnd?: Date | null;
  source: 'STATIC_CONFIG' | 'SCRAPE_LLM' | 'INFERRED_FROM_TXN' | 'USER_OVERRIDE';
  confidence: number;
};

export type NormalizedCard = {
  id: NormalizedCardId;
  userId: string;
  issuer: string;
  productSlug?: string | null;
  label: string;
  last4?: string | null;
  network?: 'VISA' | 'MASTERCARD' | 'AMEX' | 'DISCOVER' | 'OTHER';
  isCredit: boolean;
  isActive: boolean;
  isVirtual?: boolean;
  rewardRules: RewardRule[];
  creditLimitCents?: number | null;
  currentBalanceCents?: number | null;
};

export type Bucket = {
  id: BucketId;
  name: string;
  categoryKey: string;
  limitCents: number;
  postedSpendCents: number;
  pendingSpendCents: number;
  committedCents: number;
  remainingCents: number;
  period: 'MONTHLY' | 'WEEKLY' | 'ADHOC';
  isEssential: boolean;
  strictMode?: boolean;
};

export type DebtAccount = {
  id: DebtAccountId;
  name: string;
  type: 'CREDIT_CARD' | 'LOAN' | 'OTHER';
  balanceCents: number;
  creditLimitCents: number | null;
  aprPercent: number | null;
  minPaymentCents: number | null;
  dueDayOfMonth: number | null;
};

export type UserConstraints = {
  hard: {
    minEssentialCoverageDays?: number;
    maxCardUtilization?: number | null;
  };
  soft: {
    avoidNewDebt?: boolean;
    avoidInterest?: boolean;
  };
};

export type WorldParams = {
  baseInterestRate?: number | null;
  inflationEstimate?: number | null;
};

export type EngineState = {
  userId: string;
  cards: NormalizedCard[];
  buckets: Bucket[];
  debts: DebtAccount[];
  constraints: UserConstraints;
  world: WorldParams;
  cash: UserLiquidityState;
  preferences: EngineUserPreferences;
};

export type UserLiquidityState = {
  liquidCents: number | null;
  nextPaycheckDate: Date | null;
  nextPaycheckNetCents: number | null;
} | null;

export type UserDebtState = DebtAccount[];

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
  | 'PAY_DOWN_DEBT'
  | 'USE_CARD_WITH_PAYDOWN';

export type EngineAction = {
  type: EngineActionType;
  // Card-directed actions.
  cardId?: NormalizedCardId;
  // Delay actions.
  delayDays?: number;
  // Alternate merchant suggestions.
  altMerchantName?: string | null;
  altMerchantCategoryKey?: string | null;
  // Debt actions.
  debtId?: DebtAccountId;
  paydownAmountCents?: number;
  paydownScheduledDate?: Date | null;
  // Additional hints for UI/telemetry.
  meta?: {
    reasonHint?: string;
  };
};

export type BucketProjection = {
  bucketId: BucketId;
  projectedPostedSpendCents: number;
  projectedPendingSpendCents: number;
  projectedCommittedCents: number;
  projectedRemainingCents: number;
  projectedOverLimit: boolean;
};

export type DebtProjection = {
  debtId: DebtAccountId;
  projectedBalanceCents: number;
  projectedUtilization?: number | null;
};

export type CashProjection = {
  projectedLiquidCents: number | null;
  projectedOverdraftRisk: number | null;
};

export type EngineDecision = {
  actionId: string;
  action: EngineAction;
  score: number;
  reasons: string[];
  projections: {
    buckets: BucketProjection[];
    debt: DebtProjection[];
    cash: CashProjection;
  };
  constraintsBreached: string[];
  components?: ObjectiveComponentScores;
};

export type ObjectiveComponentScores = {
  rewards: number;
  runway: number;
  debtRelief: number;
  volatility: number;
  ruleViolations: number;
};

export type ObjectiveWeights = {
  rewards: number;
  runway: number;
  debtRelief: number;
  volatility: number;
  ruleViolations: number;
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
    score: number;
    constraintsBreached: string[];
    components?: ObjectiveComponentScores;
  }[];
};

export type EngineObjectiveProfileId =
  | 'MAX_REWARDS'
  | 'KILL_DEBT'
  | 'DONT_GO_BROKE'
  | 'BALANCED';

export type EngineObjectiveProfile = {
  id: EngineObjectiveProfileId;
  label: string;
  description: string;
  weights: ObjectiveWeights;
};

export type EngineUserPreferences = {
  profileId: EngineObjectiveProfileId;
  customWeights?: Partial<ObjectiveWeights>;
};
