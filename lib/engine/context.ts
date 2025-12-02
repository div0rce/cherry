import { applyInMemoryRollover } from '@/lib/buckets/periods';
import { toBucketRuntime } from '@/lib/buckets-runtime';
import { prisma } from '@/lib/prisma';
import type {
  Bucket,
  DebtAccount,
  EngineContext,
  EngineState,
  EngineSurface,
  EngineObjectiveProfileId,
  EngineUserPreferences,
  NormalizedCard,
  ObjectiveWeights,
  RewardRule,
  UserConstraints,
  WorldParams,
} from './types';
import { DEFAULT_ENGINE_USER_PREFERENCES, getObjectiveProfileById } from './objective';

// Bump when core decision behavior or payload shapes materially change.
export const ENGINE_VERSION = 'v0.2.0';

export async function fromPrismaUserToEngineState(userId: string): Promise<EngineState> {
  const [cards, buckets, debts, constraints, world, preferences] = await Promise.all([
    loadNormalizedCards(userId),
    loadBuckets(userId),
    loadDebts(userId),
    loadUserConstraints(userId),
    loadWorldParams(),
    loadUserPreferences(userId),
  ]);

  const cash =
    (await loadCashSnapshot(userId).catch(() => ({
      liquidCents: null,
      nextPaycheckDate: null,
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

export function fromExternalContextToEngineContext(input: {
  surface?: EngineSurface;
  now?: Date;
  merchantName?: string | null;
  merchantDomain?: string | null;
  merchantCategoryKey?: string | null;
  mcc?: string | null;
  amountCents?: number | null;
  locationCity?: string | null;
  locationCountry?: string | null;
}): EngineContext {
  return {
    surface: input.surface ?? 'unknown',
    now: input.now ?? new Date(),
    merchantName: input.merchantName ?? null,
    merchantDomain: input.merchantDomain ?? null,
    merchantCategoryKey: input.merchantCategoryKey ?? null,
    mcc: input.mcc ?? null,
    amountCents: input.amountCents ?? null,
    locationCity: input.locationCity ?? null,
    locationCountry: input.locationCountry ?? null,
    payPeriodDayOfCycle: null,
  };
}

// Legacy alias preserved for existing callers.
export const buildEngineContext = fromExternalContextToEngineContext;

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

function mapRewardRules(rules: { id: string; category: string; multiplier: number | null; cashbackPercent: number | null; capAmount: number | null; promoStart: Date | null; promoEnd: Date | null }[], cardId: string): RewardRule[] {
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
      promoStart: rule.promoStart ?? null,
      promoEnd: rule.promoEnd ?? null,
      source: 'STATIC_CONFIG',
      confidence: 1,
    };
  });
}

async function loadBuckets(userId: string): Promise<Bucket[]> {
  const now = new Date();
  const buckets = await prisma.bucket.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
  });

  return buckets.map((bucket) => {
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
    nextPaycheckDate: null,
    nextPaycheckNetCents: null,
  };
}

function logPreferencesWarning(message: string, meta?: unknown) {
  if (process.env.NODE_ENV === 'test') return;
  console.warn('[engine] preferences warning', { message, meta });
}

function coerceObjectiveWeights(raw: unknown): Partial<ObjectiveWeights> | undefined {
  if (!raw || typeof raw !== 'object' || raw == null) {
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

  return Object.keys(partial).length > 0 ? partial : undefined;
}

async function loadUserPreferences(userId: string): Promise<EngineUserPreferences> {
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
      logPreferencesWarning('User missing while loading preferences; using defaults', { userId });
      return { ...DEFAULT_ENGINE_USER_PREFERENCES };
    }

    const profileId = (user.engineObjectiveProfile ??
      DEFAULT_ENGINE_USER_PREFERENCES.profileId) as EngineObjectiveProfileId;
    const profile = getObjectiveProfileById(profileId);

    let customWeights: Partial<ObjectiveWeights> | undefined;
    try {
      customWeights = coerceObjectiveWeights(user.engineObjectiveWeights ?? undefined);
    } catch (err) {
      logPreferencesWarning('Failed to parse engineObjectiveWeights; ignoring overrides', {
        userId,
        err,
      });
    }

    const preferences: EngineUserPreferences = customWeights
      ? { profileId: profile.id, customWeights }
      : { profileId: profile.id };

    return preferences;
  } catch (err) {
    logPreferencesWarning('Unexpected error loading preferences; using defaults', { userId, err });
    return { ...DEFAULT_ENGINE_USER_PREFERENCES };
  }
}
