import type { HistoricalIncomeRegime } from '@prisma/client';
import { prisma, isProduction } from '../prisma';
import { isRefundLike } from '../income/classifier';
import { computeIncomeRegimesForUser, persistIncomeRegimes } from '../income/monthly';
import type { ClassifiedBankTransaction, IncomeRegimeDraft } from '../income/types';

export const REGIME_BUCKET_KEYS = {
  FIXED: 'fixed_obligations',
  ESSENTIALS_GROCERIES: 'essentials_groceries',
  ESSENTIALS_TRANSPORT: 'essentials_transport',
  ESSENTIALS_PERSONAL_CARE: 'essentials_personal_care',
  DISCRETIONARY_SOCIAL: 'discretionary_social',
  DISCRETIONARY_SHOPPING: 'discretionary_shopping',
  SAVINGS_BUFFER: 'savings_buffer',
} as const;

type BucketBand = 'fixed' | 'essentials' | 'discretionary' | 'savings';

type BucketDefinition = {
  key: string;
  band: BucketBand;
};

const BUCKET_DEFINITIONS: BucketDefinition[] = [
  { key: REGIME_BUCKET_KEYS.FIXED, band: 'fixed' },
  { key: REGIME_BUCKET_KEYS.ESSENTIALS_GROCERIES, band: 'essentials' },
  { key: REGIME_BUCKET_KEYS.ESSENTIALS_TRANSPORT, band: 'essentials' },
  { key: REGIME_BUCKET_KEYS.ESSENTIALS_PERSONAL_CARE, band: 'essentials' },
  { key: REGIME_BUCKET_KEYS.DISCRETIONARY_SOCIAL, band: 'discretionary' },
  { key: REGIME_BUCKET_KEYS.DISCRETIONARY_SHOPPING, band: 'discretionary' },
  { key: REGIME_BUCKET_KEYS.SAVINGS_BUFFER, band: 'savings' },
];

export type BucketTemplateDraft = {
  bucketKey: string;
  monthlyLimitCents: number;
  avgSpendCents: number;
  targetShareBps: number | null;
  band: BucketBand;
};

function normalizeAmountMinor(amountMinor: number): number {
  if (typeof amountMinor !== 'number' || Number.isNaN(amountMinor)) return 0;
  return Math.abs(Math.trunc(amountMinor));
}

function directionOf(tx: Pick<ClassifiedBankTransaction, 'direction'>): 'credit' | 'debit' {
  const direction = tx.direction;
  const normalized = typeof direction === 'string' ? direction : '';
  return normalized.toLowerCase() === 'credit' ? 'credit' : 'debit';
}

function normalizeText(value: string | null | undefined): string {
  const normalized = typeof value === 'string' ? value : '';
  return normalized.toUpperCase();
}

function contains(text: string, needles: string[]): boolean {
  return needles.some((needle) => text.includes(needle));
}

function inferBucketKeyForTransaction(tx: ClassifiedBankTransaction): string {
  let descValue = tx.description;
  if (descValue == null) {
    descValue = tx.rawDescription;
  }
  if (descValue == null) {
    descValue = tx.merchantName;
  }
  const desc = normalizeText(descValue);
  const mcc = typeof tx.mcc === 'number' ? tx.mcc : null;
  const p2pKind = tx.p2pKind;

  if (p2pKind === 'P2P_REPAYMENT_OUT') return REGIME_BUCKET_KEYS.DISCRETIONARY_SOCIAL;
  if (p2pKind === 'P2P_PSEUDO_MERCHANT_OUT') {
    if (contains(desc, ['HAIR', 'BARBER', 'NAIL', 'CUT'])) {
      return REGIME_BUCKET_KEYS.ESSENTIALS_PERSONAL_CARE;
    }
    if (contains(desc, ['RENT'])) return REGIME_BUCKET_KEYS.FIXED;
    return REGIME_BUCKET_KEYS.DISCRETIONARY_SOCIAL;
  }

  if (mcc != null) {
    if (mcc === 5411 || mcc === 5422 || mcc === 5441 || mcc === 5451) {
      return REGIME_BUCKET_KEYS.ESSENTIALS_GROCERIES;
    }
    if (mcc === 5541 || mcc === 5542 || mcc === 4111 || mcc === 4121) {
      return REGIME_BUCKET_KEYS.ESSENTIALS_TRANSPORT;
    }
    if (mcc === 5812 || mcc === 5813 || mcc === 5814) {
      return REGIME_BUCKET_KEYS.DISCRETIONARY_SOCIAL;
    }
    if (mcc === 7230 || mcc === 7298) {
      return REGIME_BUCKET_KEYS.ESSENTIALS_PERSONAL_CARE;
    }
  }

  if (contains(desc, ['GROCERY', 'SUPERMARKET', 'MARKET', 'SAFEWAY', 'TRADER'])) {
    return REGIME_BUCKET_KEYS.ESSENTIALS_GROCERIES;
  }
  if (contains(desc, ['UBER', 'LYFT', 'GAS', 'SHELL', 'CHEVRON'])) {
    return REGIME_BUCKET_KEYS.ESSENTIALS_TRANSPORT;
  }
  if (contains(desc, ['HAIR', 'BARBER', 'NAIL', 'CUT'])) {
    return REGIME_BUCKET_KEYS.ESSENTIALS_PERSONAL_CARE;
  }
  if (contains(desc, ['DINER', 'DINING', 'CAFE', 'COFFEE', 'RESTAURANT'])) {
    return REGIME_BUCKET_KEYS.DISCRETIONARY_SOCIAL;
  }

  return REGIME_BUCKET_KEYS.DISCRETIONARY_SHOPPING;
}

function monthStart(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function bucketSpendByMonth(
  txs: ClassifiedBankTransaction[],
  regime: IncomeRegimeDraft,
): Map<string, Map<string, number>> {
  const monthKeys = new Set(regime.months.map((m) => monthStart(m).toISOString()));
  let fallbackDate: Date | null = null;
  if (regime.startMonth != null) {
    fallbackDate = regime.startMonth;
  } else if (regime.months[0] != null) {
    fallbackDate = regime.months[0];
  } else if (regime.endMonth != null) {
    fallbackDate = regime.endMonth;
  }
  if (fallbackDate == null) {
    throw new Error('bucket-regime: missing fallback date');
  }
  const fallbackDateValue = fallbackDate;
  const spend = new Map<string, Map<string, number>>();
  for (const tx of txs) {
    const delta = deriveBucketDeltaCents(tx);
    if (delta === 0) continue;
    let timestamp: Date | null = tx.postedAt;
    if (timestamp == null) {
      timestamp = tx.occurredAt;
    }
    if (timestamp == null) {
      timestamp = fallbackDateValue;
    }
    if (timestamp == null) continue;
    const aligned = monthStart(timestamp);
    const alignedKey = aligned.toISOString();
    if (!monthKeys.has(alignedKey)) continue;
    const bucketKey = inferBucketKeyForTransaction(tx);
    let bucketMap = spend.get(bucketKey);
    if (bucketMap === undefined) {
      bucketMap = new Map<string, number>();
    }
    const currentValue = bucketMap.get(alignedKey);
    const current = typeof currentValue === 'number' ? currentValue : 0;
    bucketMap.set(alignedKey, current + delta);
    spend.set(bucketKey, bucketMap);
  }
  return spend;
}

function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.min(Math.max(value, min), max);
}

function getMapNumberOrZero(map: Map<string, number>, key: string): number {
  const value = map.get(key);
  return typeof value === 'number' ? value : 0;
}

function synthesizeTemplatesForRegime(
  regime: IncomeRegimeDraft,
  txs: ClassifiedBankTransaction[],
): BucketTemplateDraft[] {
  const spendMap = bucketSpendByMonth(txs, regime);
  const months = Math.max(regime.months.length, 1);
  const avgSpendByBucket = new Map<string, number>();
  for (const def of BUCKET_DEFINITIONS) {
    const monthSpend = spendMap.get(def.key);
    if (monthSpend === undefined) {
      avgSpendByBucket.set(def.key, 0);
      continue;
    }
    const total = Array.from(monthSpend.values()).reduce((acc, v) => acc + v, 0);
    avgSpendByBucket.set(def.key, Math.max(0, Math.round(total / months)));
  }

  const essentialSpend =
    getMapNumberOrZero(avgSpendByBucket, REGIME_BUCKET_KEYS.ESSENTIALS_GROCERIES) +
    getMapNumberOrZero(avgSpendByBucket, REGIME_BUCKET_KEYS.ESSENTIALS_TRANSPORT) +
    getMapNumberOrZero(avgSpendByBucket, REGIME_BUCKET_KEYS.ESSENTIALS_PERSONAL_CARE);
  const discretionarySpend =
    getMapNumberOrZero(avgSpendByBucket, REGIME_BUCKET_KEYS.DISCRETIONARY_SOCIAL) +
    getMapNumberOrZero(avgSpendByBucket, REGIME_BUCKET_KEYS.DISCRETIONARY_SHOPPING);

  const totalVariable = Math.max(essentialSpend + discretionarySpend, 1);
  const essentialShareRaw = essentialSpend / totalVariable;
  const essentialShare = clamp(
    !Number.isNaN(essentialShareRaw) && essentialShareRaw !== 0 ? essentialShareRaw : 0.5,
    0.4,
    0.6
  );
  const discretionaryShareRaw = discretionarySpend / totalVariable;
  const discretionaryShare = clamp(
    !Number.isNaN(discretionaryShareRaw) && discretionaryShareRaw !== 0 ? discretionaryShareRaw : 0.3,
    0.2,
    0.4
  );
  const savingsShare = clamp(1 - essentialShare - discretionaryShare, 0.05, 0.4);

  const usableFreeCash = Math.max(regime.avgFreeCashCents, Math.round(regime.avgNetIncomeCents * 0.2), 0);
  const bandBudgets: Record<BucketBand, number> = {
    fixed: clamp(regime.avgFixedCostsCents, 0, Math.round(regime.avgNetIncomeCents * 0.9)),
    essentials: Math.round(usableFreeCash * essentialShare),
    discretionary: Math.round(usableFreeCash * discretionaryShare),
    savings: Math.round(usableFreeCash * savingsShare),
  };

  const minPerBucket = Math.min(2000, Math.round(usableFreeCash * 0.1));

  const drafts: BucketTemplateDraft[] = [];

  for (const def of BUCKET_DEFINITIONS) {
    const avgSpend = getMapNumberOrZero(avgSpendByBucket, def.key);
    let limit = 0;
    if (def.band === 'fixed') {
      limit = bandBudgets.fixed;
    } else if (def.band === 'savings') {
      // provisional; finalized after allocations to other bands
      limit = bandBudgets.savings;
    } else {
      const bandSpend = def.band === 'essentials' ? essentialSpend : discretionarySpend;
      const siblings = BUCKET_DEFINITIONS.filter((b) => b.band === def.band && b.key !== REGIME_BUCKET_KEYS.SAVINGS_BUFFER);
      const shareWithinBand =
        bandSpend > 0 ? avgSpend / bandSpend : 1 / Math.max(siblings.length, 1);
      const bandBudget = bandBudgets[def.band];
      limit = Math.max(minPerBucket, Math.round(bandBudget * shareWithinBand));
    }

    drafts.push({
      bucketKey: def.key,
      monthlyLimitCents: Math.max(0, Math.round(limit)),
      avgSpendCents: Math.max(0, Math.round(avgSpend)),
      targetShareBps:
        regime.avgNetIncomeCents > 0
          ? Math.round((limit / Math.max(regime.avgNetIncomeCents, 1)) * 10000)
          : null,
      band: def.band,
    });
  }

  // Savings buffer gets whatever is left after essentials+discretionary+fixed
  const allocated = drafts
    .filter((d) => d.bucketKey !== REGIME_BUCKET_KEYS.SAVINGS_BUFFER)
    .reduce((acc, d) => acc + d.monthlyLimitCents, 0);
  const cap = Math.round(Math.max(regime.avgNetIncomeCents, usableFreeCash) * 1.2);
  const availableForSavings = Math.max(0, Math.min(cap - allocated, bandBudgets.savings));
  const savingsDraft = drafts.find((d) => d.bucketKey === REGIME_BUCKET_KEYS.SAVINGS_BUFFER);
  if (savingsDraft !== undefined) {
    savingsDraft.monthlyLimitCents = availableForSavings;
    if (savingsDraft.avgSpendCents == null) {
      savingsDraft.avgSpendCents = 0;
    }
    savingsDraft.targetShareBps =
      regime.avgNetIncomeCents > 0
        ? Math.round((availableForSavings / Math.max(regime.avgNetIncomeCents, 1)) * 10000)
        : null;
  }

  const totalAfterSavings = drafts.reduce((acc, d) => acc + d.monthlyLimitCents, 0);
  if (totalAfterSavings > cap) {
    const scale = cap / totalAfterSavings;
    for (const draft of drafts) {
      if (draft.bucketKey === REGIME_BUCKET_KEYS.FIXED) continue;
      draft.monthlyLimitCents = Math.max(0, Math.round(draft.monthlyLimitCents * scale));
    }
  }

  return drafts;
}

export async function synthesizeBucketTemplatesForUser(
  userId: string,
  regimes: HistoricalIncomeRegime[],
): Promise<Record<string, BucketTemplateDraft[]>> {
  if (isProduction()) {
    throw new Error('Bucket template synthesis is disabled in production');
  }
  const txs = await prisma.bankTransaction.findMany({
    where: { userId, source: { in: ['csv_dev'] } },
    orderBy: { postedAt: 'asc' },
    select: {
      id: true,
      userId: true,
      amountMinor: true,
      direction: true,
      description: true,
      rawDescription: true,
      merchantName: true,
      merchantCity: true,
      merchantRegion: true,
      merchantCountry: true,
      mcc: true,
      postedAt: true,
      occurredAt: true,
      source: true,
      section: true,
      incomeKind: true,
      p2pKind: true,
    },
  });

  const templatesByRegime: Record<string, BucketTemplateDraft[]> = {};
  for (const regime of regimes) {
    const start = new Date(regime.startMonth);
    const end = new Date(regime.endMonth);
    const months: Date[] = [];
    const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
    while (cursor <= end) {
      months.push(new Date(cursor));
      cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    }

    const draft: IncomeRegimeDraft = {
      startMonth: start,
      endMonth: end,
      avgNetIncomeCents: regime.avgNetIncomeCents,
      avgFixedCostsCents: regime.avgFixedCostsCents,
      avgFreeCashCents: regime.avgFreeCashCents,
      regimeLabel: regime.regimeLabel,
      months,
    };
    templatesByRegime[regime.id] = synthesizeTemplatesForRegime(
      draft,
      txs as unknown as ClassifiedBankTransaction[],
    );
  }

  await prisma.historicalBucketTemplate.deleteMany({ where: { userId } });
  const creations = [];
  for (const regime of regimes) {
    const drafts = templatesByRegime[regime.id];
    const resolvedDrafts = drafts == null ? [] : drafts;
    for (const draft of resolvedDrafts) {
      creations.push(
        prisma.historicalBucketTemplate.create({
          data: {
            userId,
            regimeId: regime.id,
            bucketKey: draft.bucketKey,
            monthlyLimitCents: draft.monthlyLimitCents,
            avgSpendCents: draft.avgSpendCents,
            targetShareBps: draft.targetShareBps,
          },
        }),
      );
    }
  }

  if (creations.length > 0) {
    await prisma.$transaction(creations);
  }

  return templatesByRegime;
}

export async function rebuildIncomeRegimesAndBuckets(userId: string): Promise<HistoricalIncomeRegime[]> {
  if (isProduction()) {
    throw new Error('Income regime rebuild is disabled in production');
  }
  const { regimes } = await computeIncomeRegimesForUser(userId);
  const savedRegimes = await persistIncomeRegimes(userId, regimes);
  await synthesizeBucketTemplatesForUser(userId, savedRegimes);
  return savedRegimes;
}

export function deriveBucketDeltaCents(tx: ClassifiedBankTransaction): number {
  const abs = normalizeAmountMinor(tx.amountMinor);
  const direction = directionOf(tx);
  if (direction === 'debit') return abs;
  if (isRefundLike(tx.incomeKind, tx.p2pKind)) return -abs;
  return 0;
}

export { inferBucketKeyForTransaction, synthesizeTemplatesForRegime };
