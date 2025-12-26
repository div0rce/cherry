import crypto from 'node:crypto';
import { BucketPeriod, RecommendationSource, RewardCategory } from '@prisma/client';
import { applyInMemoryRollover } from '../buckets/periods.js';
import { prisma } from '../prisma.js';

export const ENGINE_VERSION = 'autopilot_engine_v1';
export const SOLVER_CONFIG_VERSION = 'solver_v1';

type SnapshotRewardRule = {
  category: RewardCategory;
  multiplier: string | null;
  cashbackPercent: string | null;
  capAmount: number | null;
};

type SnapshotCard = {
  issuer: string | null;
  network: string | null;
  isCredit: boolean;
  nickname: string | null;
  rewardRules: SnapshotRewardRule[];
};

type SnapshotBucket = {
  category: RewardCategory;
  strictMode: boolean;
  period: BucketPeriod;
  budgetAmount: number;
  currentAmount: number;
  spentCents: number;
  periodStart: string;
  periodEnd: string;
};

type SnapshotObjectives = {
  profileId: string | null;
  customWeights: Record<string, number> | null;
};

export type AutopilotStateSnapshot = {
  cards: SnapshotCard[];
  buckets: SnapshotBucket[];
  objectives: SnapshotObjectives;
};

function sha256Hex(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

export function normalizeMerchantName(merchantName: string): string {
  return merchantName.trim().replace(/\s+/g, ' ').toLowerCase();
}

export function bucketizeToMinute(date: Date): string {
  const bucket = new Date(date);
  bucket.setSeconds(0, 0);
  return bucket.toISOString();
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => canonicalize(item));
  }
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
      a.localeCompare(b)
    );
    const result: Record<string, unknown> = {};
    for (const [key, val] of entries) {
      result[key] = canonicalize(val);
    }
    return result;
  }
  return value;
}

export function canonicalJsonStringify(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

function normalizeObjectiveWeights(raw: unknown): Record<string, number> | null {
  if (raw === null || raw === undefined || typeof raw !== 'object') return null;

  const weights: Record<string, number> = {};
  const allowedKeys = ['rewards', 'runway', 'debtRelief', 'volatility', 'ruleViolations'];
  for (const key of allowedKeys) {
    const val = (raw as Record<string, unknown>)[key];
    if (typeof val === 'number' && Number.isFinite(val)) {
      weights[key] = val;
    }
  }

  return Object.values(weights).length > 0 ? weights : null;
}

function normalizeRate(value: number | null | undefined): string | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return value.toFixed(6);
}

function normalizeNickname(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null;
  const collapsed = value.trim().replace(/\s+/g, ' ');
  return collapsed.length > 0 ? collapsed : null;
}

function sortRewardRules(rules: SnapshotRewardRule[]): SnapshotRewardRule[] {
  return [...rules].sort((a, b) => {
    if (a.category !== b.category) return a.category.localeCompare(b.category);
    if (a.multiplier !== b.multiplier) return (a.multiplier ?? '').localeCompare(b.multiplier ?? '');
    if (a.cashbackPercent !== b.cashbackPercent)
      return (a.cashbackPercent ?? '').localeCompare(b.cashbackPercent ?? '');
    return (a.capAmount ?? 0) - (b.capAmount ?? 0);
  });
}

function sortSnapshot(snapshot: AutopilotStateSnapshot): AutopilotStateSnapshot {
  const cards = [...snapshot.cards]
    .map((card) => ({ ...card, rewardRules: sortRewardRules(card.rewardRules) }))
    .sort((a, b) => {
      const keyA = canonicalJsonStringify({
        issuer: a.issuer ?? '',
        network: a.network ?? '',
        isCredit: a.isCredit,
        nickname: a.nickname ?? '',
        rewardRules: a.rewardRules,
      });
      const keyB = canonicalJsonStringify({
        issuer: b.issuer ?? '',
        network: b.network ?? '',
        isCredit: b.isCredit,
        nickname: b.nickname ?? '',
        rewardRules: b.rewardRules,
      });
      return keyA.localeCompare(keyB);
    });
  const buckets = [...snapshot.buckets].sort((a, b) => {
    const keyA = canonicalJsonStringify(a);
    const keyB = canonicalJsonStringify(b);
    return keyA.localeCompare(keyB);
  });

  return {
    cards,
    buckets,
    objectives: snapshot.objectives,
  };
}

export async function buildAutopilotStateSnapshot(options: {
  userId: string;
  category: RewardCategory;
  effectiveAt: Date;
  cards?: { id: string; nickname: string | null; issuer: string | null; network: string | null; isCredit: boolean }[];
  cardUniverseIds?: string[];
}): Promise<AutopilotStateSnapshot> {
  const effectiveAt = new Date(options.effectiveAt);
  const providedCards = options.cards ?? [];
  const cardUniverseIds = options.cardUniverseIds ?? providedCards.map((card) => card.id);
  const allowedCardIds = Array.from(new Set(cardUniverseIds));

  const cardsWithIds =
    providedCards.length > 0
      ? providedCards.filter((card) => (allowedCardIds.length > 0 ? allowedCardIds.includes(card.id) : true))
      : await prisma.card.findMany({
          where: {
            userId: options.userId,
            ...(allowedCardIds.length > 0 ? { id: { in: allowedCardIds } } : {}),
          },
          select: { id: true, nickname: true, issuer: true, network: true, isCredit: true },
          orderBy: { id: 'asc' },
        });

  const cardIds = cardsWithIds.map((card) => card.id);

  const rewardRulesByCardId: Record<string, SnapshotRewardRule[]> = {};

  if (cardIds.length > 0) {
    const rewardRules = await prisma.rewardRule.findMany({
      where: {
        cardId: { in: cardIds },
        category: {
          in: [options.category, RewardCategory.GENERAL_MERCHANDISE, RewardCategory.OTHER],
        },
      },
      select: {
        cardId: true,
        category: true,
        multiplier: true,
        cashbackPercent: true,
        capAmount: true,
      },
      orderBy: [{ cardId: 'asc' }, { category: 'asc' }],
    });

    for (const rule of rewardRules) {
      const list = rewardRulesByCardId[rule.cardId] ?? [];
      list.push({
        category: rule.category,
        multiplier: normalizeRate(rule.multiplier),
        cashbackPercent: normalizeRate(rule.cashbackPercent),
        capAmount: rule.capAmount,
      });
      rewardRulesByCardId[rule.cardId] = list;
    }
  }

  const cards: SnapshotCard[] = cardsWithIds.map((card) => ({
    issuer: card.issuer ?? null,
    network: card.network ?? null,
    isCredit: card.isCredit,
    nickname: normalizeNickname(card.nickname),
    rewardRules: sortRewardRules(rewardRulesByCardId[card.id] ?? []),
  }));

  const buckets = await prisma.bucket.findMany({
    where: { userId: options.userId, category: options.category },
    orderBy: { id: 'asc' },
  });

  const rolledBuckets: SnapshotBucket[] = buckets.map((bucket) => {
    const rolled = applyInMemoryRollover(bucket, effectiveAt);
    return {
      category: rolled.category,
      strictMode: rolled.strictMode,
      period: rolled.period,
      budgetAmount: rolled.budgetAmount,
      currentAmount: rolled.currentAmount,
      spentCents: rolled.spentCents,
      periodStart: rolled.periodStart.toISOString(),
      periodEnd: rolled.periodEnd.toISOString(),
    };
  });

  const user = await prisma.user.findUnique({
    where: { id: options.userId },
    select: { engineObjectiveProfile: true, engineObjectiveWeights: true },
  });

  const objectives: SnapshotObjectives = {
    profileId:
      typeof user?.engineObjectiveProfile === 'string' && user.engineObjectiveProfile.length > 0
        ? user.engineObjectiveProfile
        : null,
    customWeights: normalizeObjectiveWeights(user?.engineObjectiveWeights ?? null),
  };

  return sortSnapshot({
    cards,
    buckets: rolledBuckets,
    objectives,
  });
}

export function buildAutopilotStateSnapshotHash(snapshot: AutopilotStateSnapshot): string {
  const canonicalSnapshot = canonicalJsonStringify(sortSnapshot(snapshot));
  return sha256Hex(canonicalSnapshot);
}

export function computeEngineDecisionIdV1(params: {
  userId: string;
  source: RecommendationSource;
  amountCents: number;
  currency: string;
  merchantName: string;
  category: RewardCategory;
  effectiveAt: Date;
  stateSnapshotHash: string;
  engineVersion?: string;
  solverConfigVersion?: string;
}): string {
  const currencyNormalized = params.currency.trim().toUpperCase();
  const payload = {
    userId: params.userId,
    source: params.source,
    amountCents: params.amountCents,
    currency: currencyNormalized,
    normalizedMerchant: normalizeMerchantName(params.merchantName),
    category: params.category,
    effectiveAtBucket: bucketizeToMinute(params.effectiveAt),
    engineVersion: params.engineVersion ?? ENGINE_VERSION,
    solverConfigVersion: params.solverConfigVersion ?? SOLVER_CONFIG_VERSION,
    stateSnapshotHash: params.stateSnapshotHash,
  };

  const canonicalPayload = canonicalJsonStringify(payload);
  const digest = sha256Hex(canonicalPayload);
  return `edid_v1_${digest}`;
}
