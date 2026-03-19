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
export type EnginePrimitive =
  | 'essentiality'
  | 'debt'
  | 'liquidCash'
  | 'utilization';

export type PrimitiveAvailability =
  | { available: true; reason: 'loaded' }
  | { available: false; reason: 'not_modeled' | 'not_loaded' | 'partial' };

export type EngineCapabilityMap = Record<EnginePrimitive, PrimitiveAvailability>;

export type Maybe<T> = { kind: 'available'; value: T } | { kind: 'unavailable' };

export type EngineDegradedDimensions = {
  essentialProtection: boolean;
  debtPressure: boolean;
  liquidity: boolean;
  utilization: boolean;
};

export function available<T>(value: T): Maybe<T> {
  return { kind: 'available', value };
}

export function unavailable<T>(): Maybe<T> {
  return { kind: 'unavailable' };
}

export function hasAvailableValue<T>(value: Maybe<T>): value is { kind: 'available'; value: T } {
  return value.kind === 'available';
}

export function toMaybe<T>(value: Maybe<T> | T | null | undefined): Maybe<T> {
  if (value == null) return unavailable();
  if (typeof value === 'object' && 'kind' in value) {
    return value as Maybe<T>;
  }
  return available(value as T);
}

export function createUnavailableEngineCapabilities(): EngineCapabilityMap {
  return {
    essentiality: { available: false, reason: 'not_modeled' },
    debt: { available: false, reason: 'not_modeled' },
    liquidCash: { available: false, reason: 'not_modeled' },
    utilization: { available: false, reason: 'not_modeled' },
  };
}

export function createLoadedEngineCapabilities(): EngineCapabilityMap {
  return {
    essentiality: { available: true, reason: 'loaded' },
    debt: { available: true, reason: 'loaded' },
    liquidCash: { available: true, reason: 'loaded' },
    utilization: { available: true, reason: 'loaded' },
  };
}

export function deriveDegradedDimensions(
  capabilities: EngineCapabilityMap
): EngineDegradedDimensions {
  return {
    essentialProtection: capabilities.essentiality.available !== true,
    debtPressure: capabilities.debt.available !== true,
    liquidity: capabilities.liquidCash.available !== true,
    utilization: capabilities.utilization.available !== true,
  };
}

export function getEngineRuntimeMetadata(
  state?: Pick<EngineState, 'capabilities'>
): EngineRuntimeMetadata {
  const capabilities =
    state != null && state.capabilities != null
      ? state.capabilities
      : createUnavailableEngineCapabilities();
  return {
    capabilities,
    degraded: deriveDegradedDimensions(capabilities),
  };
}

export type RewardRule = {
  id: string;
  cardId: NormalizedCardId;
  categoryKey: string;
  mccPattern?: string | null;
  rateType: 'CASHBACK' | 'POINTS_PER_DOLLAR';
  rateValue: number;
  capAmountCents?: number | null;
  capPeriod?: 'MONTHLY' | 'QUARTERLY' | 'YEARLY' | null;
  promoStartMs?: number | null;
  promoEndMs?: number | null;
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
  linkedDebtId?: DebtAccountId | null;
  creditLimitCents?: number | null;
  currentBalanceCents?: number | null;
};

export type Bucket = {
  id: BucketId;
  name: string;
  categoryKey: string;
  limitCents: number | null;
  postedSpendCents: number;
  pendingSpendCents: number;
  committedCents: number;
  remainingCents: number;
  period: 'MONTHLY' | 'WEEKLY' | 'ADHOC';
  essentiality?: Maybe<boolean>;
  isEssential?: boolean;
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
  debts: Maybe<DebtAccount[]>;
  constraints: UserConstraints;
  world: WorldParams;
  cash: Maybe<UserLiquidityState>;
  capabilities: EngineCapabilityMap;
  preferences: EngineUserPreferences;
};

export type UserLiquidityState = {
  liquidCents: number | null;
  nextPaycheckDateMs: number | null;
  nextPaycheckNetCents: number | null;
};

export type UserDebtState = DebtAccount[];

export type EngineContext = {
  surface: EngineSurface;
  nowMs: number;
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
  paydownScheduledDateMs?: number | null;
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
};

export type ObjectiveWeights = {
  rewards: number;
  runway: number;
  debtRelief: number;
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

export type EngineRuntimeMetadata = {
  capabilities: EngineCapabilityMap;
  degraded: EngineDegradedDimensions;
};

export function getDebtAccounts(
  debts: EngineState['debts']
): DebtAccount[] {
  return hasAvailableValue(debts) ? debts.value : [];
}

export function getCashState(
  cash: EngineState['cash']
): UserLiquidityState | null {
  return hasAvailableValue(cash) ? cash.value : null;
}

export function hasKnownBucketEssentiality(bucket: Bucket): boolean {
  if (bucket.essentiality != null && hasAvailableValue(bucket.essentiality)) {
    return true;
  }
  return typeof bucket.isEssential === 'boolean';
}

export function isBucketEssential(bucket: Bucket): boolean {
  if (bucket.essentiality != null && hasAvailableValue(bucket.essentiality)) {
    return bucket.essentiality.value === true;
  }
  return bucket.isEssential === true;
}

export function getEngineCapabilities(state: Pick<EngineState, 'capabilities'>): EngineCapabilityMap {
  return state.capabilities;
}

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
