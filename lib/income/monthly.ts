import type { HistoricalIncomeRegime } from '@prisma/client';
import { prisma, isProduction } from '../prisma.js';
import { classifyIncomeAndP2PForUser, getNetEarnedIncomeCents } from './classifier.js';
import type { ClassifiedBankTransaction, IncomeRegimeDraft, MonthlyIncomeSnapshot } from './types.js';

function monthStart(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function normalizeAmountMinor(amountMinor: number): number {
  if (typeof amountMinor !== 'number' || Number.isNaN(amountMinor)) return 0;
  return Math.trunc(amountMinor);
}

function directionOf(tx: Pick<ClassifiedBankTransaction, 'direction'>): 'credit' | 'debit' {
  return (tx.direction ?? '').toLowerCase() === 'credit' ? 'credit' : 'debit';
}

function clampNonNegative(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return value < 0 ? 0 : Math.round(value);
}

function normalizeMerchantKey(value: string | null | undefined): string {
  return (value ?? '').toUpperCase().replace(/\s+/g, ' ').trim();
}

type SnapshotCentsField =
  | 'payrollCents'
  | 'allowanceCents'
  | 'sideGigCents'
  | 'refundCents'
  | 'internalTransferCents'
  | 'otherCents';

const INCOME_KIND_FIELD: Partial<Record<ClassifiedBankTransaction['incomeKind'], SnapshotCentsField>> = {
  PAYROLL: 'payrollCents',
  ALLOWANCE: 'allowanceCents',
  SIDE_GIG: 'sideGigCents',
  REFUND: 'refundCents',
  INTERNAL_TRANSFER: 'internalTransferCents',
};

function emptySnapshot(month: Date): MonthlyIncomeSnapshot {
  return {
    monthStart: month,
    totalCreditsCents: 0,
    payrollCents: 0,
    allowanceCents: 0,
    sideGigCents: 0,
    refundCents: 0,
    internalTransferCents: 0,
    otherCents: 0,
    netEarnedIncomeCents: 0,
  };
}

function addCreditToSnapshot(snapshot: MonthlyIncomeSnapshot, tx: ClassifiedBankTransaction): void {
  const absCents = Math.abs(normalizeAmountMinor(tx.amountMinor));
  snapshot.totalCreditsCents += absCents;
  snapshot.netEarnedIncomeCents += getNetEarnedIncomeCents(tx.incomeKind, tx.p2pKind, absCents);
  // OTHER, NONE and unknown kinds land in otherCents
  snapshot[INCOME_KIND_FIELD[tx.incomeKind] ?? 'otherCents'] += absCents;
  if (tx.p2pKind === 'P2P_ALLOWANCE') {
    snapshot.allowanceCents += absCents;
    snapshot.netEarnedIncomeCents += absCents;
  }
}

export function buildMonthlyIncomeSnapshots(txs: ClassifiedBankTransaction[]): MonthlyIncomeSnapshot[] {
  const monthMap = new Map<string, MonthlyIncomeSnapshot>();

  for (const tx of txs) {
    if (directionOf(tx) !== 'credit') continue;
    const timestamp = tx.postedAt ?? tx.occurredAt;
    if (timestamp == null) continue;
    const month = monthStart(timestamp);
    const key = month.toISOString();
    const existing = monthMap.get(key) ?? emptySnapshot(month);
    addCreditToSnapshot(existing, tx);
    monthMap.set(key, existing);
  }

  return Array.from(monthMap.values()).sort(
    (a, b) => a.monthStart.getTime() - b.monthStart.getTime(),
  );
}

type RegimeDetectionOpts = {
  shiftThresholdRatio?: number;
  rollingWindow?: number;
  minMonthsPerRegime?: number;
};

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    const left = sorted[mid - 1] ?? 0;
    const right = sorted[mid] ?? left;
    return (left + right) / 2;
  }
  return sorted[mid] ?? 0;
}

function rollingMedian(values: number[], windowSize: number, idx: number): number {
  const start = Math.max(0, idx - windowSize + 1);
  const slice = values.slice(start, idx + 1);
  return median(slice);
}

function averageNetIncome(months: MonthlyIncomeSnapshot[]): number {
  return months.reduce((acc, m) => acc + clampNonNegative(m.netEarnedIncomeCents), 0) / Math.max(months.length, 1);
}

function regimeDraft(months: MonthlyIncomeSnapshot[], bounds: { startMonth: Date; endMonth: Date }): IncomeRegimeDraft {
  const avgNetIncome = averageNetIncome(months);
  return {
    startMonth: bounds.startMonth,
    endMonth: bounds.endMonth,
    avgNetIncomeCents: Math.round(avgNetIncome),
    avgFixedCostsCents: 0,
    avgFreeCashCents: Math.round(avgNetIncome),
    regimeLabel: null,
    months: months.map((m) => m.monthStart),
  };
}

type RegimeSplit = { monthly: MonthlyIncomeSnapshot[]; startIdx: number; endIdx: number };

function closedRegimeDraft(split: RegimeSplit): IncomeRegimeDraft {
  const { monthly, startIdx, endIdx } = split;
  const regimeMonths = monthly.slice(startIdx, endIdx);
  const fallbackStart = monthly[startIdx]?.monthStart ?? monthly[0]?.monthStart ?? monthStart(new Date(0));
  const startMonth = regimeMonths[0]?.monthStart ?? monthly[startIdx]?.monthStart ?? fallbackStart;
  const endMonth =
    regimeMonths.at(-1)?.monthStart ?? monthly[endIdx - 1]?.monthStart ?? monthly.at(-1)?.monthStart ?? startMonth;
  return regimeDraft(regimeMonths, { startMonth, endMonth });
}

function tailRegimeDraft(split: RegimeSplit): IncomeRegimeDraft | null {
  const { monthly, startIdx } = split;
  const tailMonths = monthly.slice(startIdx);
  if (tailMonths.length === 0) return null;
  const tailStart = tailMonths[0]?.monthStart ?? monthly.at(-1)?.monthStart ?? monthStart(new Date(0));
  const tailEnd = tailMonths.at(-1)?.monthStart ?? tailStart;
  return regimeDraft(tailMonths, { startMonth: tailStart, endMonth: tailEnd });
}

function weightedAverage(
  last: IncomeRegimeDraft,
  draft: IncomeRegimeDraft,
  field: 'avgNetIncomeCents' | 'avgFreeCashCents',
): number {
  return Math.round(
    (last[field] * last.months.length + draft[field] * draft.months.length) /
      Math.max(last.months.length + draft.months.length, 1),
  );
}

type RegimeConfig = { shiftThreshold: number; windowSize: number; minMonths: number };

// merge tiny trailing regimes
function mergeTinyRegimes(drafts: IncomeRegimeDraft[], config: RegimeConfig): IncomeRegimeDraft[] {
  const merged: IncomeRegimeDraft[] = [];
  for (const draft of drafts) {
    const last = merged.at(-1);
    if (last === undefined || draft.months.length >= config.minMonths) {
      merged.push(draft);
      continue;
    }
    merged[merged.length - 1] = {
      ...last,
      endMonth: draft.endMonth,
      months: [...last.months, ...draft.months],
      avgNetIncomeCents: weightedAverage(last, draft, 'avgNetIncomeCents'),
      avgFreeCashCents: weightedAverage(last, draft, 'avgFreeCashCents'),
    };
  }
  return merged;
}

function resolveRegimeConfig(opts?: RegimeDetectionOpts): RegimeConfig {
  return {
    shiftThreshold: opts?.shiftThresholdRatio ?? 0.35,
    windowSize: opts?.rollingWindow ?? 3,
    minMonths: opts?.minMonthsPerRegime ?? 2,
  };
}

type BaselineState = { startIdx: number; baseline: number };

function relativeShift(state: BaselineState, medianIncome: number): number {
  return state.baseline === 0 ? 1 : Math.abs(medianIncome - state.baseline) / state.baseline;
}

function smoothBaseline(state: BaselineState, medianIncome: number): number {
  return state.baseline === 0 ? medianIncome : state.baseline * 0.7 + medianIncome * 0.3;
}

function splitRegimes(monthly: MonthlyIncomeSnapshot[], config: RegimeConfig): IncomeRegimeDraft[] {
  const incomes = monthly.map((m) => clampNonNegative(m.netEarnedIncomeCents));
  const drafts: IncomeRegimeDraft[] = [];
  const state: BaselineState = { startIdx: 0, baseline: Math.max(1, incomes[0] ?? 0) };

  for (let i = 0; i < monthly.length; i += 1) {
    const medianIncome = rollingMedian(incomes, config.windowSize, i);
    const shifted = relativeShift(state, medianIncome) > config.shiftThreshold;
    if (shifted && i - state.startIdx >= config.minMonths) {
      drafts.push(closedRegimeDraft({ monthly, startIdx: state.startIdx, endIdx: i }));
      state.startIdx = i;
      state.baseline = Math.max(1, medianIncome);
    } else {
      state.baseline = smoothBaseline(state, medianIncome);
    }
  }

  const tail = tailRegimeDraft({ monthly, startIdx: state.startIdx, endIdx: monthly.length });
  if (tail !== null) drafts.push(tail);
  return drafts;
}

export function detectIncomeRegimesFromMonthly(
  monthly: MonthlyIncomeSnapshot[],
  opts?: RegimeDetectionOpts,
): IncomeRegimeDraft[] {
  if (monthly.length === 0) return [];
  const config = resolveRegimeConfig(opts);
  const merged = mergeTinyRegimes(splitRegimes(monthly, config), config);
  return merged.map((regime, idx) => ({
    ...regime,
    regimeLabel: regime.regimeLabel ?? `Regime ${idx + 1}`,
  }));
}

const MIN_RECURRING_CENTS = 1500; // $15

function isRecurringCandidate(tx: ClassifiedBankTransaction, monthKeys: Set<string>): boolean {
  if (directionOf(tx) !== 'debit') return false;
  if (tx.postedAt == null) return false;
  if (!monthKeys.has(monthStart(tx.postedAt).toISOString())) return false;
  if (Math.abs(normalizeAmountMinor(tx.amountMinor)) < MIN_RECURRING_CENTS) return false;
  return tx.p2pKind !== 'P2P_REPAYMENT_OUT';
}

function groupRecurringCandidates(
  txs: ClassifiedBankTransaction[],
  regime: IncomeRegimeDraft,
): Map<string, ClassifiedBankTransaction[]> {
  const keyWithinRange = new Set(regime.months.map((m) => m.toISOString()));
  const byMerchant = new Map<string, ClassifiedBankTransaction[]>();
  for (const tx of txs) {
    if (!isRecurringCandidate(tx, keyWithinRange)) continue;
    const merchantKey = normalizeMerchantKey(tx.merchantName ?? tx.description ?? tx.rawDescription);
    const list = byMerchant.get(merchantKey) ?? [];
    list.push(tx);
    byMerchant.set(merchantKey, list);
  }
  return byMerchant;
}

function gapsInDays(group: ClassifiedBankTransaction[]): number[] {
  const dates = group.map((g) => g.postedAt).sort((a, b) => a.getTime() - b.getTime());
  const gaps: number[] = [];
  for (let i = 1; i < dates.length; i += 1) {
    const prev = dates[i - 1];
    const curr = dates[i];
    if (!prev || !curr) continue;
    gaps.push((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));
  }
  return gaps;
}

function relativeSpread(amounts: number[]): number {
  const max = Math.max(...amounts);
  return max === 0 ? 0 : (max - Math.min(...amounts)) / max;
}

type Cadence = { minGap: number; maxGap: number; multiplier: number };

// monthly-ish cadence first, then weekly recurring (converted to a monthly approximation)
const RECURRING_CADENCES: Cadence[] = [
  { minGap: 25, maxGap: 35, multiplier: 1 },
  { minGap: 5, maxGap: 10, multiplier: 4 },
];

function recurringMonthlyAmount(group: ClassifiedBankTransaction[]): number {
  if (group.length < 2) return 0;
  const medianGap = median(gapsInDays(group));
  const amounts = group.map((g) => Math.abs(normalizeAmountMinor(g.amountMinor)));
  if (relativeSpread(amounts) > 0.4) return 0;
  const cadence = RECURRING_CADENCES.find((c) => medianGap >= c.minGap && medianGap <= c.maxGap);
  return cadence === undefined ? 0 : median(amounts) * cadence.multiplier;
}

function detectRecurringAmountPerMonth(
  txs: ClassifiedBankTransaction[],
  regime: IncomeRegimeDraft,
  opts?: { capRatio?: number },
): number {
  let total = 0;
  for (const group of groupRecurringCandidates(txs, regime).values()) {
    total += recurringMonthlyAmount(group);
  }
  const capRatio = opts?.capRatio ?? 0.9;
  const capped = Math.min(total, Math.round(regime.avgNetIncomeCents * capRatio));
  return capped < 0 ? 0 : Math.round(capped);
}

export async function computeIncomeRegimesForUser(userId: string): Promise<{
  transactions: ClassifiedBankTransaction[];
  monthly: MonthlyIncomeSnapshot[];
  regimes: IncomeRegimeDraft[];
}> {
  const transactions = await classifyIncomeAndP2PForUser(userId, { persist: false, sourceFilter: ['csv_dev'] });
  const monthly = buildMonthlyIncomeSnapshots(transactions);
  const regimes = detectIncomeRegimesFromMonthly(monthly);

  const enriched = regimes.map((regime) => {
    const fixedCosts = detectRecurringAmountPerMonth(transactions, regime);
    const avgFreeCashCents = Math.round(regime.avgNetIncomeCents - fixedCosts);
    return {
      ...regime,
      avgFixedCostsCents: fixedCosts,
      avgFreeCashCents,
    };
  });

  return { transactions, monthly, regimes: enriched };
}

export async function persistIncomeRegimes(
  userId: string,
  drafts: IncomeRegimeDraft[],
): Promise<HistoricalIncomeRegime[]> {
  if (isProduction()) {
    throw new Error('Persisting income regimes is disabled in production');
  }

  await prisma.historicalBucketTemplate.deleteMany({ where: { userId } });
  await prisma.historicalIncomeRegime.deleteMany({ where: { userId } });

  const created = await prisma.$transaction(
    drafts.map((draft) =>
      prisma.historicalIncomeRegime.create({
        data: {
          userId,
          startMonth: draft.startMonth,
          endMonth: draft.endMonth,
          avgNetIncomeCents: Math.round(draft.avgNetIncomeCents),
          avgFixedCostsCents: Math.round(draft.avgFixedCostsCents),
          avgFreeCashCents: Math.round(draft.avgFreeCashCents),
          regimeLabel: draft.regimeLabel,
        },
      }),
    ),
  );

  return created;
}
