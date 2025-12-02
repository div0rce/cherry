import { applyInMemoryRollover } from '@/lib/buckets/periods';
import { prisma } from '@/lib/prisma';
import type {
  EngineBucketSnapshot,
  EngineCard,
  EngineCashSnapshot,
  EngineContext,
  EngineDebtSnapshot,
  EngineSurface,
  EngineUserPreferences,
  EngineUserState,
} from './types';
import { DEFAULT_OBJECTIVE_WEIGHTS } from './objective';

// Bump when core decision behavior or payload shapes materially change.
export const ENGINE_VERSION = 'v0.1.0';

export async function buildEngineUserState(userId: string): Promise<EngineUserState> {
  const [cards, buckets] = await Promise.all([
    loadCardsForUser(userId),
    loadBucketsForUser(userId),
  ]);

  // Debt + cash snapshots are not modeled yet; keep placeholders to avoid nulls.
  const debts = await loadDebtsForUser();
  const cash = await loadCashSnapshotForUser();
  const preferences = await loadPreferencesForUser();

  return {
    userId,
    cards,
    buckets,
    debts,
    cash,
    preferences,
  };
}

export function buildEngineContext(input: {
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

async function loadCardsForUser(userId: string): Promise<EngineCard[]> {
  const cards = await prisma.card.findMany({
    where: { userId },
    include: { rewardRules: true },
    orderBy: { createdAt: 'asc' },
  });

  return cards.map((card) => ({
    id: card.id,
    issuer: card.issuer,
    label: card.nickname,
    network:
      card.network === 'VISA' ||
      card.network === 'MASTERCARD' ||
      card.network === 'AMEX' ||
      card.network === 'DISCOVER'
        ? card.network
        : 'OTHER',
    productSlug: null,
    rewards: card.rewardRules.map((rule) => {
      const rateType = rule.multiplier != null ? 'POINTS_PER_DOLLAR' : 'CASHBACK';
      const rateValue =
        rateType === 'POINTS_PER_DOLLAR'
          ? rule.multiplier ?? 0
          : (rule.cashbackPercent ?? 0) / 100;

      return {
        categoryKey: rule.category,
        rateType,
        rateValue,
        capAmountCents: rule.capAmount ?? null,
        capPeriod: null,
        promoStart: rule.promoStart ?? null,
        promoEnd: rule.promoEnd ?? null,
        confidence: 1,
        source: 'STATIC_CONFIG',
      };
    }),
    isCredit: card.isCredit,
    canUseForContext: true,
  }));
}

async function loadBucketsForUser(userId: string): Promise<EngineBucketSnapshot[]> {
  const now = new Date();
  const buckets = await prisma.bucket.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
  });

  return buckets.map((bucket) => {
    const rolled = applyInMemoryRollover(bucket, now);
    return {
      id: rolled.id,
      name: rolled.name,
      categoryKey: rolled.category,
      limitCents: rolled.budgetAmount ?? null,
      balanceCents: rolled.spentCents ?? 0,
      period: rolled.period === 'MONTHLY' ? 'MONTHLY' : 'WEEKLY',
    };
  });
}

async function loadDebtsForUser(): Promise<EngineDebtSnapshot[]> {
  // Debt accounts are not modeled in the current schema; keep an empty list to satisfy the type.
  return [];
}

async function loadCashSnapshotForUser(): Promise<EngineCashSnapshot> {
  // Cash runway tracking is not modeled yet; keep nullable placeholders.
  return {
    liquidCents: null,
    nextPaycheckDate: null,
    nextPaycheckNetCents: null,
  };
}

async function loadPreferencesForUser(): Promise<EngineUserPreferences> {
  return {
    rewardsWeight: DEFAULT_OBJECTIVE_WEIGHTS.rewards,
    runwayWeight: DEFAULT_OBJECTIVE_WEIGHTS.runway,
    debtReliefWeight: DEFAULT_OBJECTIVE_WEIGHTS.debtRelief,
    volatilityPenaltyWeight: DEFAULT_OBJECTIVE_WEIGHTS.volatilityPenalty,
    ruleViolationPenaltyWeight: DEFAULT_OBJECTIVE_WEIGHTS.ruleViolationPenalty,
  };
}
