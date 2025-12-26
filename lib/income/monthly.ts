import type { HistoricalIncomeRegime } from '@prisma/client';
import { prisma, isProduction } from '@/lib/prisma';
import { classifyIncomeAndP2PForUser, getNetEarnedIncomeCents } from './classifier';
import type { ClassifiedBankTransaction, IncomeRegimeDraft, MonthlyIncomeSnapshot } from './types';

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

export function buildMonthlyIncomeSnapshots(txs: ClassifiedBankTransaction[]): MonthlyIncomeSnapshot[] {
  const monthMap = new Map<string, MonthlyIncomeSnapshot>();

  for (const tx of txs) {
    if (directionOf(tx) !== 'credit') continue;
    const timestamp = tx.postedAt ?? tx.occurredAt;
    if (timestamp == null) continue;
    const month = monthStart(timestamp);
    const key = month.toISOString();
    const absCents = Math.abs(normalizeAmountMinor(tx.amountMinor));

    const existing = monthMap.get(key) ?? {
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

    const netEarned = getNetEarnedIncomeCents(tx.incomeKind, tx.p2pKind, absCents);
    existing.totalCreditsCents += absCents;
    existing.netEarnedIncomeCents += netEarned;

    switch (tx.incomeKind) {
      case 'PAYROLL':
        existing.payrollCents += absCents;
        break;
      case 'ALLOWANCE':
        existing.allowanceCents += absCents;
        break;
      case 'SIDE_GIG':
        existing.sideGigCents += absCents;
        break;
      case 'REFUND':
        existing.refundCents += absCents;
        break;
      case 'INTERNAL_TRANSFER':
        existing.internalTransferCents += absCents;
        break;
      case 'OTHER':
      case 'NONE':
      default:
        existing.otherCents += absCents;
    }

    if (tx.p2pKind === 'P2P_ALLOWANCE') {
      existing.allowanceCents += absCents;
      existing.netEarnedIncomeCents += absCents;
    }

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

export function detectIncomeRegimesFromMonthly(
  monthly: MonthlyIncomeSnapshot[],
  opts?: RegimeDetectionOpts,
): IncomeRegimeDraft[] {
  if (monthly.length === 0) return [];
  const shiftThreshold = opts?.shiftThresholdRatio ?? 0.35;
  const windowSize = opts?.rollingWindow ?? 3;
  const minMonths = opts?.minMonthsPerRegime ?? 2;

  const incomes = monthly.map((m) => clampNonNegative(m.netEarnedIncomeCents));
  const drafts: IncomeRegimeDraft[] = [];

  let currentStartIdx = 0;
  const firstIncome = incomes[0] ?? 0;
  let currentBaseline = Math.max(1, firstIncome);

  for (let i = 0; i < monthly.length; i += 1) {
    const medianIncome = rollingMedian(incomes, windowSize, i);
    const delta = currentBaseline === 0 ? 1 : Math.abs(medianIncome - currentBaseline) / currentBaseline;

    if (delta > shiftThreshold && i - currentStartIdx >= minMonths) {
      const regimeMonths = monthly.slice(currentStartIdx, i);
      const avgNetIncome =
        regimeMonths.reduce((acc, m) => acc + clampNonNegative(m.netEarnedIncomeCents), 0) /
        Math.max(regimeMonths.length, 1);
      const fallbackStart =
        monthly[currentStartIdx]?.monthStart ?? monthly[0]?.monthStart ?? monthStart(new Date(0));
      const startMonth = regimeMonths[0]?.monthStart ?? monthly[currentStartIdx]?.monthStart ?? fallbackStart;
      const endMonth =
        regimeMonths.at(-1)?.monthStart ??
        monthly[i - 1]?.monthStart ??
        monthly.at(-1)?.monthStart ??
        startMonth;
      drafts.push({
        startMonth,
        endMonth,
        avgNetIncomeCents: Math.round(avgNetIncome),
        avgFixedCostsCents: 0,
        avgFreeCashCents: Math.round(avgNetIncome),
        regimeLabel: null,
        months: regimeMonths.map((m) => m.monthStart),
      });
      currentStartIdx = i;
      currentBaseline = Math.max(1, medianIncome);
    } else {
      currentBaseline = currentBaseline === 0 ? medianIncome : currentBaseline * 0.7 + medianIncome * 0.3;
    }
  }

  const tailMonths = monthly.slice(currentStartIdx);
  if (tailMonths.length > 0) {
    const avgNetIncome =
      tailMonths.reduce((acc, m) => acc + clampNonNegative(m.netEarnedIncomeCents), 0) /
      Math.max(tailMonths.length, 1);
    const fallbackTailStart = tailMonths[0]?.monthStart ?? monthly.at(-1)?.monthStart ?? monthStart(new Date(0));
    const tailStart = tailMonths[0]?.monthStart ?? monthly.at(-1)?.monthStart ?? fallbackTailStart;
    const tailEnd = tailMonths.at(-1)?.monthStart ?? tailStart;
    drafts.push({
      startMonth: tailStart,
      endMonth: tailEnd,
      avgNetIncomeCents: Math.round(avgNetIncome),
      avgFixedCostsCents: 0,
      avgFreeCashCents: Math.round(avgNetIncome),
      regimeLabel: null,
      months: tailMonths.map((m) => m.monthStart),
    });
  }

  // merge tiny trailing regimes
  const merged: IncomeRegimeDraft[] = [];
  for (const draft of drafts) {
    const last = merged.at(-1);
    if (last && draft.months.length < minMonths) {
      merged[merged.length - 1] = {
        ...last,
        endMonth: draft.endMonth,
        months: [...last.months, ...draft.months],
        avgNetIncomeCents: Math.round(
          (last.avgNetIncomeCents * last.months.length + draft.avgNetIncomeCents * draft.months.length) /
            Math.max(last.months.length + draft.months.length, 1),
        ),
        avgFreeCashCents: Math.round(
          (last.avgFreeCashCents * last.months.length + draft.avgFreeCashCents * draft.months.length) /
            Math.max(last.months.length + draft.months.length, 1),
        ),
      };
    } else {
      merged.push(draft);
    }
  }

  return merged.map((regime, idx) => ({
    ...regime,
    regimeLabel: regime.regimeLabel ?? `Regime ${idx + 1}`,
  }));
}

function detectRecurringAmountPerMonth(
  txs: ClassifiedBankTransaction[],
  regime: IncomeRegimeDraft,
  opts?: { capRatio?: number },
): number {
  const minRecurringCents = 1500; // $15
  const keyWithinRange = new Set(regime.months.map((m) => m.toISOString()));
  const byMerchant = new Map<string, ClassifiedBankTransaction[]>();

  for (const tx of txs) {
    if (directionOf(tx) !== 'debit') continue;
    if (tx.postedAt == null) continue;
    const monthKey = monthStart(tx.postedAt).toISOString();
    if (!keyWithinRange.has(monthKey)) continue;
    const absCents = Math.abs(normalizeAmountMinor(tx.amountMinor));
    if (absCents < minRecurringCents) continue;
    if (tx.p2pKind === 'P2P_REPAYMENT_OUT') continue;

    const merchantKey = normalizeMerchantKey(tx.merchantName ?? tx.description ?? tx.rawDescription);
    const list = byMerchant.get(merchantKey) ?? [];
    list.push(tx);
    byMerchant.set(merchantKey, list);
  }

  let total = 0;
  for (const [, group] of byMerchant) {
    if (group.length < 2) continue;
    const dates = group.map((g) => g.postedAt).sort((a, b) => a.getTime() - b.getTime());
    const gaps: number[] = [];
    for (let i = 1; i < dates.length; i += 1) {
      const prev = dates[i - 1];
      const curr = dates[i];
      if (!prev || !curr) continue;
      gaps.push((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));
    }
    const medianGap = median(gaps);
    const amounts = group.map((g) => Math.abs(normalizeAmountMinor(g.amountMinor)));
    const spread = Math.max(...amounts) === 0 ? 0 : (Math.max(...amounts) - Math.min(...amounts)) / Math.max(...amounts);
    const typicalAmount = median(amounts);

    // monthly-ish cadence
    if (medianGap >= 25 && medianGap <= 35 && spread <= 0.4) {
      total += typicalAmount;
      continue;
    }
    // weekly recurring (convert to monthly approximation)
    if (medianGap >= 5 && medianGap <= 10 && spread <= 0.4) {
      total += typicalAmount * 4;
    }
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
