import type { HistoricalBucketTemplate, HistoricalIncomeRegime } from '@prisma/client';
import {
  REGIME_BUCKET_KEYS,
  deriveBucketDeltaCents,
  inferBucketKeyForTransaction,
} from '../buckets/regimes.js';
import type { ClassifiedBankTransaction } from '../income/types.js';

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

function emptyResult(regimeId: string | null = null): AppliedBucketResult {
  return { regimeId, bucketKey: null, usageBeforeBps: null, usageAfterBps: null, bucketLimitCents: null };
}

function usageBps(spentCents: number, limit: number): number | null {
  return limit > 0 ? Math.round((spentCents / limit) * 10000) : null;
}

function isZeroCredit(tx: ClassifiedBankTransaction, delta: number): boolean {
  return delta === 0 && (tx.direction ?? '').toLowerCase() === 'credit';
}

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

  private findTemplate(regimeId: string, bucketKey: string): HistoricalBucketTemplate | undefined {
    const templates = this.templatesByRegime.get(regimeId);
    if (templates === undefined) return undefined;
    return templates.get(bucketKey) ?? templates.get(REGIME_BUCKET_KEYS.ESSENTIALS_GROCERIES);
  }

  apply(tx: ClassifiedBankTransaction): AppliedBucketResult {
    const date = tx.postedAt ?? tx.occurredAt;
    if (date == null) {
      return emptyResult();
    }
    const regimeId = this.findRegimeIdForDate(date);
    if (regimeId === null || regimeId === '') {
      return emptyResult();
    }

    const bucketKey = inferBucketKeyForTransaction(tx);
    const template = this.findTemplate(regimeId, bucketKey);
    if (template === undefined) {
      return emptyResult(regimeId);
    }

    const monthKey = monthStart(date).toISOString();
    const state = this.getBucketState(regimeId, monthKey, bucketKey, template.monthlyLimitCents);
    const before = state.spentCents;
    const limit = state.limitCents > 0 ? state.limitCents : template.monthlyLimitCents;
    const usageBeforeBps = usageBps(before, limit);

    const delta = deriveBucketDeltaCents(tx);
    if (isZeroCredit(tx, delta)) {
      return emptyResult(regimeId);
    }
    const after = Math.max(0, before + delta);
    state.spentCents = after;
    const usageAfterBps = usageBps(after, limit);

    return {
      regimeId,
      bucketKey,
      usageBeforeBps,
      usageAfterBps,
      bucketLimitCents: limit,
    };
  }
}
