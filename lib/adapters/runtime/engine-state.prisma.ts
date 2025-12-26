import { applyInMemoryRollover } from '../../buckets/periods.js';
import { toBucketRuntime } from '../../buckets-runtime.js';
import { prisma } from '../../prisma.js';
import type {
  Bucket,
  DebtAccount,
  EngineState,
  EngineObjectiveProfileId,
  EngineUserPreferences,
  NormalizedCard,
  ObjectiveWeights,
  RewardRule,
  UserConstraints,
  WorldParams,
} from '../../engine/types.js';
import { DEFAULT_ENGINE_USER_PREFERENCES, getObjectiveProfileById } from '../../engine/objective.js';
import { DEFAULT_ENGINE_RUNTIME, type EngineRuntime } from '../../engine/runtime.js';
import { asError } from '../../errors.js';

export async function fromPrismaUserToEngineState(
  userId: string,
  nowMs: number,
  runtime: EngineRuntime = DEFAULT_ENGINE_RUNTIME
): Promise<EngineState> {
  if (nowMs == null || Number.isNaN(nowMs)) {
    throw new Error('fromPrismaUserToEngineState requires explicit `nowMs`');
  }

  const [cards, buckets, debts, constraints, world, preferences] = await Promise.all([
    loadNormalizedCards(userId),
    loadBuckets(userId, nowMs),
    loadDebts(userId),
    loadUserConstraints(userId),
    loadWorldParams(),
    loadUserPreferences(userId, runtime),
  ]);

  const cash =
    (await loadCashSnapshot(userId).catch((_error: unknown) => ({
      liquidCents: null,
      nextPaycheckDateMs: null,
      nextPaycheckNetCents: null,
    }))) ?? null;

  return {
    userId,
    cards,
    buckets,
    debts,
    constraints,
    world,
    cash,
    preferences,
  };
}

async function loadNormalizedCards(userId: string): Promise<NormalizedCard[]> {
  const cards = await prisma.card.findMany({
    where: { userId },
    include: { rewardRules: true },
    orderBy: { createdAt: 'asc' },
  });

  return cards.map<NormalizedCard>((card) => ({
    id: card.id,
    userId,
    issuer: card.issuer,
    productSlug: null,
    label: card.nickname,
    last4: null,
    network:
      card.network === 'VISA' ||
      card.network === 'MASTERCARD' ||
      card.network === 'AMEX' ||
      card.network === 'DISCOVER'
        ? card.network
        : 'OTHER',
    isCredit: card.isCredit,
    isActive: true,
    isVirtual: false,
    rewardRules: mapRewardRules(card.rewardRules, card.id),
    creditLimitCents: null,
    currentBalanceCents: null,
  }));
}

function mapRewardRules(
  rules: {
    id: string;
    category: string;
    multiplier: number | null;
    cashbackPercent: number | null;
    capAmount: number | null;
    promoStart: Date | null;
    promoEnd: Date | null;
  }[],
  cardId: string
): RewardRule[] {
  return rules.map((rule) => {
    const rateType = rule.multiplier != null ? 'POINTS_PER_DOLLAR' : 'CASHBACK';
    const rateValue =
      rateType === 'POINTS_PER_DOLLAR'
        ? rule.multiplier ?? 0
        : (rule.cashbackPercent ?? 0) / 100;

    return {
      id: rule.id,
      cardId,
      categoryKey: rule.category,
      mccPattern: null,
      rateType,
      rateValue,
      capAmountCents: rule.capAmount ?? null,
      capPeriod: null,
      promoStartMs: rule.promoStart ? rule.promoStart.getTime() : null,
      promoEndMs: rule.promoEnd ? rule.promoEnd.getTime() : null,
      source: 'STATIC_CONFIG',
      confidence: 1,
    };
  });
}

async function loadBuckets(userId: string, nowMs: number): Promise<Bucket[]> {
  const buckets = await prisma.bucket.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
  });

  return buckets.map((bucket) => {
    const now = new Date(nowMs);
    const rolled = applyInMemoryRollover(bucket, now);
    const runtime = toBucketRuntime(rolled);
    return {
      id: runtime.id,
      name: runtime.name,
      categoryKey: runtime.category,
      limitCents: runtime.limitCents,
      postedSpendCents: runtime.postedSpendCents,
      pendingSpendCents: runtime.pendingSpendCents,
      committedCents: runtime.committedCents,
      remainingCents: runtime.remainingCents,
      period: runtime.period === 'MONTHLY' ? 'MONTHLY' : 'WEEKLY',
      isEssential: false,
      strictMode: runtime.strictMode ?? false,
    };
  });
}

async function loadDebts(_userId: string): Promise<DebtAccount[]> {
  // Debt accounts are not modeled in the current schema; keep an empty list to satisfy the type.
  return [];
}

async function loadUserConstraints(_userId: string): Promise<UserConstraints> {
  return {
    hard: {
      minEssentialCoverageDays: 0,
      maxCardUtilization: null,
    },
    soft: {
      avoidInterest: false,
      avoidNewDebt: false,
    },
  };
}

async function loadWorldParams(): Promise<WorldParams> {
  return {
    baseInterestRate: null,
    inflationEstimate: null,
  };
}

async function loadCashSnapshot(_userId: string): Promise<EngineState['cash']> {
  return {
    liquidCents: null,
    nextPaycheckDateMs: null,
    nextPaycheckNetCents: null,
  };
}

function logPreferencesWarning(runtime: EngineRuntime, message: string, meta?: unknown) {
  if (!runtime.enableLogs) return;
  const logger = runtime.logger;
  if (!logger) return;
  logger.warn('[engine] preferences warning', { message, meta });
}

function coerceObjectiveWeights(raw: unknown): Partial<ObjectiveWeights> | undefined {
  if (raw === null || typeof raw !== 'object') {
    return undefined;
  }

  const maybeWeights = raw as Record<string, unknown>;
  const partial: Partial<ObjectiveWeights> = {};

  if (typeof maybeWeights['rewards'] === 'number') partial.rewards = maybeWeights['rewards'];
  if (typeof maybeWeights['runway'] === 'number') partial.runway = maybeWeights['runway'];
  if (typeof maybeWeights['debtRelief'] === 'number')
    partial.debtRelief = maybeWeights['debtRelief'];
  if (typeof maybeWeights['volatility'] === 'number') partial.volatility = maybeWeights['volatility'];
  if (typeof maybeWeights['ruleViolations'] === 'number')
    partial.ruleViolations = maybeWeights['ruleViolations'];

  return Object.values(partial).length > 0 ? partial : undefined;
}

async function loadUserPreferences(
  userId: string,
  runtime: EngineRuntime
): Promise<EngineUserPreferences> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        engineObjectiveProfile: true,
        engineObjectiveWeights: true,
      },
    });

    if (!user) {
      logPreferencesWarning(runtime, 'User missing while loading preferences; using defaults', { userId });
      return { ...DEFAULT_ENGINE_USER_PREFERENCES };
    }

    const profileId = (user.engineObjectiveProfile ??
      DEFAULT_ENGINE_USER_PREFERENCES.profileId) as EngineObjectiveProfileId;
    const profile = getObjectiveProfileById(profileId, runtime);

    let customWeights: Partial<ObjectiveWeights> | undefined;
    try {
      customWeights = coerceObjectiveWeights(user.engineObjectiveWeights ?? undefined);
    } catch (err: unknown) {
      asError(err);
      logPreferencesWarning(runtime, 'Failed to parse engineObjectiveWeights; ignoring overrides', {
        userId,
        err,
      });
    }

    const preferences: EngineUserPreferences = customWeights
      ? { profileId: profile.id, customWeights }
      : { profileId: profile.id };

    return preferences;
  } catch (err: unknown) {
    asError(err);
    logPreferencesWarning(runtime, 'Unexpected error loading preferences; using defaults', {
      userId,
      err,
    });
    return { ...DEFAULT_ENGINE_USER_PREFERENCES };
  }
}
