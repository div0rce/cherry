import { applyInMemoryRollover } from '@/lib/buckets/periods';
import { prisma } from '@/lib/prisma';
import type {
  Bucket,
  DebtAccount,
  EngineContext,
  EngineState,
  EngineSurface,
  NormalizedCard,
  RewardRule,
  UserConstraints,
  WorldParams,
} from './types';

// Bump when core decision behavior or payload shapes materially change.
export const ENGINE_VERSION = 'v0.1.0';

export async function fromPrismaUserToEngineState(userId: string): Promise<EngineState> {
  const [cards, buckets, debts, constraints, world] = await Promise.all([
    loadNormalizedCards(userId),
    loadBuckets(userId),
    loadDebts(userId),
    loadUserConstraints(userId),
    loadWorldParams(),
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
    return {
      id: rolled.id,
      name: rolled.name,
      categoryKey: rolled.category,
      limitCents: rolled.budgetAmount ?? null,
      spentCents: rolled.spentCents ?? 0,
      period: rolled.period === 'MONTHLY' ? 'MONTHLY' : 'WEEKLY',
      isEssential: false,
      strictMode: rolled.strictMode ?? false,
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
