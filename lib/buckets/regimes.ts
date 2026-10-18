import type { HistoricalIncomeRegime } from '@prisma/client';
import { prisma, isProduction } from '../prisma.js';
import { isRefundLike } from '../income/classifier.js';
import { computeIncomeRegimesForUser, persistIncomeRegimes } from '../income/monthly.js';
import type { ClassifiedBankTransaction, IncomeRegimeDraft } from '../income/types.js';

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

function normalizeAmountMinor(tx: Pick<ClassifiedBankTransaction, 'amountMinor'>): number {
  const amountMinor = tx.amountMinor;
  if (typeof amountMinor !== 'number' || Number.isNaN(amountMinor)) return 0;
  return Math.abs(Math.trunc(amountMinor));
}

function directionOf(tx: Pick<ClassifiedBankTransaction, 'direction'>): 'credit' | 'debit' {
  const direction = tx.direction;
  const normalized = typeof direction === 'string' ? direction : '';
  return normalized.toLowerCase() === 'credit' ? 'credit' : 'debit';
}

function descriptionTextOf(
  tx: Pick<ClassifiedBankTransaction, 'description' | 'rawDescription' | 'merchantName'>,
): string {
  const value = tx.description ?? tx.rawDescription ?? tx.merchantName;
  const normalized = typeof value === 'string' ? value : '';
  return normalized.toUpperCase();
}

function contains(text: string, needles: string[]): boolean {
  return needles.some((needle) => text.includes(needle));
}

const PERSONAL_CARE_WORDS = ['HAIR', 'BARBER', 'NAIL', 'CUT'];

const MCC_BUCKETS = new Map<number, string>([
  [5411, REGIME_BUCKET_KEYS.ESSENTIALS_GROCERIES],
  [5422, REGIME_BUCKET_KEYS.ESSENTIALS_GROCERIES],
  [5441, REGIME_BUCKET_KEYS.ESSENTIALS_GROCERIES],
  [5451, REGIME_BUCKET_KEYS.ESSENTIALS_GROCERIES],
  [5541, REGIME_BUCKET_KEYS.ESSENTIALS_TRANSPORT],
  [5542, REGIME_BUCKET_KEYS.ESSENTIALS_TRANSPORT],
  [4111, REGIME_BUCKET_KEYS.ESSENTIALS_TRANSPORT],
  [4121, REGIME_BUCKET_KEYS.ESSENTIALS_TRANSPORT],
  [5812, REGIME_BUCKET_KEYS.DISCRETIONARY_SOCIAL],
  [5813, REGIME_BUCKET_KEYS.DISCRETIONARY_SOCIAL],
  [5814, REGIME_BUCKET_KEYS.DISCRETIONARY_SOCIAL],
  [7230, REGIME_BUCKET_KEYS.ESSENTIALS_PERSONAL_CARE],
  [7298, REGIME_BUCKET_KEYS.ESSENTIALS_PERSONAL_CARE],
]);

const DESCRIPTION_RULES: Array<[string[], string]> = [
  [['GROCERY', 'SUPERMARKET', 'MARKET', 'SAFEWAY', 'TRADER'], REGIME_BUCKET_KEYS.ESSENTIALS_GROCERIES],
  [['UBER', 'LYFT', 'GAS', 'SHELL', 'CHEVRON'], REGIME_BUCKET_KEYS.ESSENTIALS_TRANSPORT],
  [PERSONAL_CARE_WORDS, REGIME_BUCKET_KEYS.ESSENTIALS_PERSONAL_CARE],
  [['DINER', 'DINING', 'CAFE', 'COFFEE', 'RESTAURANT'], REGIME_BUCKET_KEYS.DISCRETIONARY_SOCIAL],
];

function inferPseudoMerchantBucket(tx: ClassifiedBankTransaction): string {
  const desc = descriptionTextOf(tx);
  if (contains(desc, PERSONAL_CARE_WORDS)) return REGIME_BUCKET_KEYS.ESSENTIALS_PERSONAL_CARE;
  if (contains(desc, ['RENT'])) return REGIME_BUCKET_KEYS.FIXED;
  return REGIME_BUCKET_KEYS.DISCRETIONARY_SOCIAL;
}

function inferBucketFromDescription(tx: ClassifiedBankTransaction): string {
  const desc = descriptionTextOf(tx);
  const rule = DESCRIPTION_RULES.find(([needles]) => contains(desc, needles));
  return rule === undefined ? REGIME_BUCKET_KEYS.DISCRETIONARY_SHOPPING : rule[1];
}

function inferBucketKeyForTransaction(tx: ClassifiedBankTransaction): string {
  if (tx.p2pKind === 'P2P_REPAYMENT_OUT') return REGIME_BUCKET_KEYS.DISCRETIONARY_SOCIAL;
  if (tx.p2pKind === 'P2P_PSEUDO_MERCHANT_OUT') return inferPseudoMerchantBucket(tx);
  const mccBucket = typeof tx.mcc === 'number' ? MCC_BUCKETS.get(tx.mcc) : undefined;
  return mccBucket ?? inferBucketFromDescription(tx);
}

function monthStart(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function bucketSpendByMonth(
  txs: ClassifiedBankTransaction[],
  regime: IncomeRegimeDraft,
): Map<string, Map<string, number>> {
  const monthKeys = new Set(regime.months.map((m) => monthStart(m).toISOString()));
  const fallbackDate: Date | null | undefined = regime.startMonth ?? regime.months[0] ?? regime.endMonth;
  if (fallbackDate == null) {
    throw new Error('bucket-regime: missing fallback date');
  }
  const spend = new Map<string, Map<string, number>>();
  for (const tx of txs) {
    const delta = deriveBucketDeltaCents(tx);
    if (delta === 0) continue;
    const alignedKey = monthStart(tx.postedAt ?? tx.occurredAt ?? fallbackDate).toISOString();
    if (!monthKeys.has(alignedKey)) continue;
    const bucketKey = inferBucketKeyForTransaction(tx);
    const bucketMap = spend.get(bucketKey) ?? new Map<string, number>();
    bucketMap.set(alignedKey, getMapNumberOrZero(bucketMap, alignedKey) + delta);
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

function averageSpendByBucket(
  spendMap: Map<string, Map<string, number>>,
  regime: IncomeRegimeDraft,
): Map<string, number> {
  const months = Math.max(regime.months.length, 1);
  const avgSpendByBucket = new Map<string, number>();
  for (const def of BUCKET_DEFINITIONS) {
    const monthSpend = spendMap.get(def.key);
    const total = monthSpend === undefined ? 0 : Array.from(monthSpend.values()).reduce((acc, v) => acc + v, 0);
    avgSpendByBucket.set(def.key, Math.max(0, Math.round(total / months)));
  }
  return avgSpendByBucket;
}

function sumBand(avgSpendByBucket: Map<string, number>, band: BucketBand): number {
  return BUCKET_DEFINITIONS.filter((def) => def.band === band).reduce(
    (acc, def) => acc + getMapNumberOrZero(avgSpendByBucket, def.key),
    0,
  );
}

function shareOrDefault(raw: number, fallback: number): number {
  return !Number.isNaN(raw) && raw !== 0 ? raw : fallback;
}

function targetShareBps(limit: number, regime: IncomeRegimeDraft): number | null {
  const avgNetIncomeCents = regime.avgNetIncomeCents;
  return avgNetIncomeCents > 0 ? Math.round((limit / Math.max(avgNetIncomeCents, 1)) * 10000) : null;
}

type BandPlan = {
  bandBudgets: Record<BucketBand, number>;
  bandSpend: Record<BucketBand, number>;
  minPerBucket: number;
  cap: number;
};

function planBands(regime: IncomeRegimeDraft, avgSpendByBucket: Map<string, number>): BandPlan {
  const essentialSpend = sumBand(avgSpendByBucket, 'essentials');
  const discretionarySpend = sumBand(avgSpendByBucket, 'discretionary');
  const totalVariable = Math.max(essentialSpend + discretionarySpend, 1);
  const essentialShare = clamp(shareOrDefault(essentialSpend / totalVariable, 0.5), 0.4, 0.6);
  const discretionaryShare = clamp(shareOrDefault(discretionarySpend / totalVariable, 0.3), 0.2, 0.4);
  const savingsShare = clamp(1 - essentialShare - discretionaryShare, 0.05, 0.4);

  const usableFreeCash = Math.max(regime.avgFreeCashCents, Math.round(regime.avgNetIncomeCents * 0.2), 0);
  return {
    bandBudgets: {
      fixed: clamp(regime.avgFixedCostsCents, 0, Math.round(regime.avgNetIncomeCents * 0.9)),
      essentials: Math.round(usableFreeCash * essentialShare),
      discretionary: Math.round(usableFreeCash * discretionaryShare),
      savings: Math.round(usableFreeCash * savingsShare),
    },
    bandSpend: { fixed: 0, essentials: essentialSpend, discretionary: discretionarySpend, savings: 0 },
    minPerBucket: Math.min(2000, Math.round(usableFreeCash * 0.1)),
    cap: Math.round(Math.max(regime.avgNetIncomeCents, usableFreeCash) * 1.2),
  };
}

function limitForBucket(def: BucketDefinition, avgSpendByBucket: Map<string, number>, plan: BandPlan): number {
  const avgSpend = getMapNumberOrZero(avgSpendByBucket, def.key);
  // savings is provisional; finalized after allocations to other bands
  if (def.band === 'fixed' || def.band === 'savings') return plan.bandBudgets[def.band];
  const bandSpend = plan.bandSpend[def.band];
  const siblings = BUCKET_DEFINITIONS.filter((b) => b.band === def.band && b.key !== REGIME_BUCKET_KEYS.SAVINGS_BUFFER);
  const shareWithinBand = bandSpend > 0 ? avgSpend / bandSpend : 1 / Math.max(siblings.length, 1);
  return Math.max(plan.minPerBucket, Math.round(plan.bandBudgets[def.band] * shareWithinBand));
}

function finalizeSavings(drafts: BucketTemplateDraft[], regime: IncomeRegimeDraft, plan: BandPlan): void {
  // Savings buffer gets whatever is left after essentials+discretionary+fixed
  const allocated = drafts
    .filter((d) => d.bucketKey !== REGIME_BUCKET_KEYS.SAVINGS_BUFFER)
    .reduce((acc, d) => acc + d.monthlyLimitCents, 0);
  const availableForSavings = Math.max(0, Math.min(plan.cap - allocated, plan.bandBudgets.savings));
  const savingsDraft = drafts.find((d) => d.bucketKey === REGIME_BUCKET_KEYS.SAVINGS_BUFFER);
  if (savingsDraft === undefined) return;
  savingsDraft.monthlyLimitCents = availableForSavings;
  savingsDraft.targetShareBps = targetShareBps(availableForSavings, regime);
}

function scaleToCap(drafts: BucketTemplateDraft[], plan: BandPlan): void {
  const cap = plan.cap;
  const totalAfterSavings = drafts.reduce((acc, d) => acc + d.monthlyLimitCents, 0);
  if (totalAfterSavings <= cap) return;
  const scale = cap / totalAfterSavings;
  for (const draft of drafts) {
    if (draft.bucketKey === REGIME_BUCKET_KEYS.FIXED) continue;
    draft.monthlyLimitCents = Math.max(0, Math.round(draft.monthlyLimitCents * scale));
  }
}

function synthesizeTemplatesForRegime(
  regime: IncomeRegimeDraft,
  txs: ClassifiedBankTransaction[],
): BucketTemplateDraft[] {
  const spendMap = bucketSpendByMonth(txs, regime);
  const avgSpendByBucket = averageSpendByBucket(spendMap, regime);
  const plan = planBands(regime, avgSpendByBucket);

  const drafts: BucketTemplateDraft[] = BUCKET_DEFINITIONS.map((def) => {
    const avgSpend = getMapNumberOrZero(avgSpendByBucket, def.key);
    const limit = limitForBucket(def, avgSpendByBucket, plan);
    return {
      bucketKey: def.key,
      monthlyLimitCents: Math.max(0, Math.round(limit)),
      avgSpendCents: Math.max(0, Math.round(avgSpend)),
      targetShareBps: targetShareBps(limit, regime),
      band: def.band,
    };
  });

  finalizeSavings(drafts, regime, plan);
  scaleToCap(drafts, plan);
  return drafts;
}

const BANK_TRANSACTION_SELECT = {
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
} as const;

function monthsBetween(start: Date, end: Date): Date[] {
  const months: Date[] = [];
  const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
  while (cursor <= end) {
    months.push(new Date(cursor));
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return months;
}

function regimeToDraft(regime: HistoricalIncomeRegime): IncomeRegimeDraft {
  const start = new Date(regime.startMonth);
  const end = new Date(regime.endMonth);
  return {
    startMonth: start,
    endMonth: end,
    avgNetIncomeCents: regime.avgNetIncomeCents,
    avgFixedCostsCents: regime.avgFixedCostsCents,
    avgFreeCashCents: regime.avgFreeCashCents,
    regimeLabel: regime.regimeLabel,
    months: monthsBetween(start, end),
  };
}

function buildTemplateCreations(
  userId: string,
  regimes: HistoricalIncomeRegime[],
  templatesByRegime: Record<string, BucketTemplateDraft[]>,
) {
  return regimes.flatMap((regime) =>
    (templatesByRegime[regime.id] ?? []).map((draft) =>
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
    ),
  );
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
    select: BANK_TRANSACTION_SELECT,
  });

  const templatesByRegime: Record<string, BucketTemplateDraft[]> = {};
  for (const regime of regimes) {
    templatesByRegime[regime.id] = synthesizeTemplatesForRegime(
      regimeToDraft(regime),
      txs as unknown as ClassifiedBankTransaction[],
    );
  }

  await prisma.historicalBucketTemplate.deleteMany({ where: { userId } });
  const creations = buildTemplateCreations(userId, regimes, templatesByRegime);
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
  const abs = normalizeAmountMinor(tx);
  const direction = directionOf(tx);
  if (direction === 'debit') return abs;
  if (isRefundLike(tx.incomeKind, tx.p2pKind)) return -abs;
  return 0;
}

export { inferBucketKeyForTransaction, synthesizeTemplatesForRegime };
