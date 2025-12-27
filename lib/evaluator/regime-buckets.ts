import type { HistoricalBucketTemplate, HistoricalIncomeRegime } from '@prisma/client';
import {
  REGIME_BUCKET_KEYS,
  deriveBucketDeltaCents,
  inferBucketKeyForTransaction,
} from '../buckets/regimes';
import type { ClassifiedBankTransaction } from '../income/types';

function monthStart(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

type BucketState = {
  limitCents: number;
  spentCents: number;
};

export type AppliedBucketResult = {
  regimeId: string | null;
  bucketKey: string | null;
  usageBeforeBps: number | null;
  usageAfterBps: number | null;
  bucketLimitCents: number | null;
};

export class RegimeBucketTracker {
  private regimes: HistoricalIncomeRegime[];

  private templatesByRegime: Map<string, Map<string, HistoricalBucketTemplate>>;

  private ledger: Map<string, Map<string, Map<string, BucketState>>>;

  constructor(regimes: HistoricalIncomeRegime[], templates: HistoricalBucketTemplate[]) {
    this.regimes = [...regimes].sort((a, b) => a.startMonth.getTime() - b.startMonth.getTime());
    this.templatesByRegime = new Map();
    this.ledger = new Map();

    for (const template of templates) {
      const byBucket = this.templatesByRegime.get(template.regimeId) ?? new Map<string, HistoricalBucketTemplate>();
      byBucket.set(template.bucketKey, template);
      this.templatesByRegime.set(template.regimeId, byBucket);
    }
  }

  private findRegimeIdForDate(date: Date): string | null {
    const ts = monthStart(date).getTime();
    const match = this.regimes.find(
      (regime) =>
        monthStart(regime.startMonth).getTime() <= ts && ts <= monthStart(regime.endMonth).getTime(),
    );
    return match?.id ?? null;
  }

  private getBucketState(regimeId: string, monthKey: string, bucketKey: string, limitCents: number): BucketState {
    const regimeLedger = this.ledger.get(regimeId) ?? new Map<string, Map<string, BucketState>>();
    const monthLedger = regimeLedger.get(monthKey) ?? new Map<string, BucketState>();
    const existing = monthLedger.get(bucketKey);
    if (existing !== undefined) return existing;
    const created: BucketState = { limitCents, spentCents: 0 };
    monthLedger.set(bucketKey, created);
    regimeLedger.set(monthKey, monthLedger);
    this.ledger.set(regimeId, regimeLedger);
    return created;
  }

  apply(tx: ClassifiedBankTransaction): AppliedBucketResult {
    const date = tx.postedAt ?? tx.occurredAt;
    if (date == null) {
      return { regimeId: null, bucketKey: null, usageBeforeBps: null, usageAfterBps: null, bucketLimitCents: null };
    }
    const regimeId = this.findRegimeIdForDate(date);
    if (regimeId === null || regimeId === undefined || regimeId === '') {
      return { regimeId: null, bucketKey: null, usageBeforeBps: null, usageAfterBps: null, bucketLimitCents: null };
    }

    const templates = this.templatesByRegime.get(regimeId);
    if (templates === undefined || templates.size === 0) {
      return { regimeId, bucketKey: null, usageBeforeBps: null, usageAfterBps: null, bucketLimitCents: null };
    }

    const bucketKey = inferBucketKeyForTransaction(tx);
    const template = templates.get(bucketKey) ?? templates.get(REGIME_BUCKET_KEYS.ESSENTIALS_GROCERIES);
    if (template === undefined) {
      return { regimeId, bucketKey: null, usageBeforeBps: null, usageAfterBps: null, bucketLimitCents: null };
    }

    const monthKey = monthStart(date).toISOString();
    const state = this.getBucketState(regimeId, monthKey, bucketKey, template.monthlyLimitCents);
    const before = state.spentCents;
    const limit = state.limitCents > 0 ? state.limitCents : template.monthlyLimitCents;
    const usageBeforeBps = limit > 0 ? Math.round((before / limit) * 10000) : null;

    const delta = deriveBucketDeltaCents(tx);
    if (delta === 0 && (tx.direction ?? '').toLowerCase() === 'credit') {
      return { regimeId, bucketKey: null, usageBeforeBps: null, usageAfterBps: null, bucketLimitCents: null };
    }
    const after = Math.max(0, before + delta);
    state.spentCents = after;
    const usageAfterBps = limit > 0 ? Math.round((after / limit) * 10000) : null;

    return {
      regimeId,
      bucketKey,
      usageBeforeBps,
      usageAfterBps,
      bucketLimitCents: limit,
    };
  }
}
