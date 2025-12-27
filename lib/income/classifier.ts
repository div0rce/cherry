import type { BankTransactionIncomeKind, BankTransactionP2PKind, Prisma } from '@prisma/client';
import { prisma, isProduction } from '../prisma';
import type { IncomeKind, P2PKind, ClassifiedBankTransaction } from './types';
import { hasText } from '../text';

type ClassifiableTx = Pick<
  ClassifiedBankTransaction,
  | 'id'
  | 'userId'
  | 'amountMinor'
  | 'direction'
  | 'description'
  | 'rawDescription'
  | 'merchantName'
  | 'postedAt'
  | 'occurredAt'
  | 'source'
  | 'section'
  | 'incomeKind'
  | 'p2pKind'
>;

type CounterpartyStats = {
  key: string;
  creditSamples: { amountCents: number; postedAt: Date }[];
  debitSamples: { amountCents: number; postedAt: Date }[];
  medianCreditGapDays: number | null;
  medianDebitGapDays: number | null;
  creditAmountSpread: number;
  debitAmountSpread: number;
};

export type ClassificationResult = {
  txId: string;
  incomeKind: IncomeKind;
  p2pKind: P2PKind;
};

const PAYROLL_KEYWORDS = ['PAYROLL', 'DIRECT DEP', 'DIR DEP', 'ADP', 'PAYCHEX', 'GUSTO', 'PAYMENT PAYROLL'];
const ALLOWANCE_KEYWORDS = ['ALLOWANCE', 'STIPEND', 'POCKET MONEY', 'SUPPORT', 'MOM', 'DAD', 'PARENT'];
const REFUND_KEYWORDS = ['REFUND', 'REVERSAL', 'RETURN', 'REVERS', 'CASHBACK', 'REV', 'ADJ', 'DISPUTE'];
const INTERNAL_TRANSFER_KEYWORDS = ['TRANSFER', 'XFER', 'MOVE MONEY', 'TO SAVINGS', 'FROM SAVINGS'];
const SIDE_GIG_KEYWORDS = ['UBER', 'LYFT', 'ETSY', 'SHOPIFY', 'SQUARE', 'CASH APP', 'TASKRABBIT', 'DOORDASH', 'INSTACART'];
const P2P_KEYWORDS = ['ZELLE', 'VENMO', 'VEN MO', 'CASH APP', 'CASHAPP', 'APPLE CASH', 'PAYPAL', 'PAY PAL'];
const SERVICE_MEMO_KEYWORDS = ['CUT', 'HAIR', 'BARBER', 'NAIL', 'NAILS', 'WAX', 'CLEAN', 'RENT', 'LESSON', 'TUTOR', 'TRAINING'];
const REPAYMENT_MEMO_KEYWORDS = ['UBER', 'DINNER', 'FOOD', 'REIMBURSE', 'PAYBACK', 'SPLIT', 'VENMO REQUEST'];

function toIncomeEnum(kind: IncomeKind): BankTransactionIncomeKind {
  switch (kind) {
    case 'PAYROLL':
      return 'PAYROLL';
    case 'ALLOWANCE':
      return 'ALLOWANCE';
    case 'SIDE_GIG':
      return 'SIDE_GIG';
    case 'REFUND':
      return 'REFUND';
    case 'INTERNAL_TRANSFER':
      return 'INTERNAL_TRANSFER';
    case 'OTHER':
      return 'OTHER';
    case 'NONE':
    default:
      return 'NONE';
  }
}

function toP2PEnum(kind: P2PKind): BankTransactionP2PKind {
  switch (kind) {
    case 'P2P_ALLOWANCE':
      return 'P2P_ALLOWANCE';
    case 'P2P_REPAYMENT_IN':
      return 'P2P_REPAYMENT_IN';
    case 'P2P_REPAYMENT_OUT':
      return 'P2P_REPAYMENT_OUT';
    case 'P2P_PSEUDO_MERCHANT_IN':
      return 'P2P_PSEUDO_MERCHANT_IN';
    case 'P2P_PSEUDO_MERCHANT_OUT':
      return 'P2P_PSEUDO_MERCHANT_OUT';
    case 'NONE':
    default:
      return 'NONE';
  }
}

function normalizeText(value: string | null | undefined): string {
  return (value ?? '').trim().toUpperCase();
}

function containsKeyword(value: string, keywords: string[]): boolean {
  return keywords.some((kw) => value.includes(kw));
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    const left = sorted[mid - 1];
    const right = sorted[mid];
    if (left == null || right == null) return null;
    return (left + right) / 2;
  }
  const value = sorted[mid];
  return value ?? null;
}

function amountSpread(values: number[]): number {
  if (values.length === 0) return 0;
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (max === 0) return 0;
  return (max - min) / max;
}

function daysBetween(a: Date, b: Date): number {
  return Math.abs(a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24);
}

function medianGaps(dates: Date[]): number | null {
  if (dates.length < 2) return null;
  const sorted = [...dates].sort((a, b) => a.getTime() - b.getTime());
  const gaps: number[] = [];
  for (let i = 1; i < sorted.length; i += 1) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    if (!prev || !curr) continue;
    gaps.push(daysBetween(prev, curr));
  }
  return median(gaps);
}

function normalizeCounterpartyKey(tx: ClassifiableTx): string {
  const base = normalizeText(tx.merchantName ?? tx.description ?? tx.rawDescription ?? tx.section ?? '');
  return base.replace(/\s+/g, ' ').trim();
}

function isP2P(tx: ClassifiableTx): boolean {
  const desc = normalizeText(tx.description);
  const raw = normalizeText(tx.rawDescription);
  return containsKeyword(desc, P2P_KEYWORDS) || containsKeyword(raw, P2P_KEYWORDS);
}

function buildCounterpartyStats(txs: ClassifiableTx[]): Map<string, CounterpartyStats> {
  const map = new Map<string, CounterpartyStats>();
  for (const tx of txs) {
    if (!isP2P(tx)) continue;
    const key = normalizeCounterpartyKey(tx);
    const stats = map.get(key) ?? {
      key,
      creditSamples: [],
      debitSamples: [],
      medianCreditGapDays: null,
      medianDebitGapDays: null,
      creditAmountSpread: 0,
      debitAmountSpread: 0,
    };
    const amountCents = Math.abs(Number.isFinite(tx.amountMinor) ? tx.amountMinor : 0);
    const target = (tx.direction ?? '').toUpperCase() === 'CREDIT' ? stats.creditSamples : stats.debitSamples;
    target.push({ amountCents, postedAt: tx.postedAt });
    map.set(key, stats);
  }

  for (const [key, stats] of map) {
    stats.medianCreditGapDays = medianGaps(stats.creditSamples.map((s) => s.postedAt));
    stats.medianDebitGapDays = medianGaps(stats.debitSamples.map((s) => s.postedAt));
    stats.creditAmountSpread = amountSpread(stats.creditSamples.map((s) => s.amountCents));
    stats.debitAmountSpread = amountSpread(stats.debitSamples.map((s) => s.amountCents));
    map.set(key, stats);
  }

  return map;
}

function looksLikeAllowanceP2P(stats: CounterpartyStats | undefined): boolean {
  if (!stats) return false;
  if (stats.creditSamples.length < 3) return false;
  const gap = stats.medianCreditGapDays ?? null;
  const spread = stats.creditAmountSpread;
  return gap != null && gap >= 5 && gap <= 12 && spread <= 0.35;
}

function looksLikePseudoMerchant(stats: CounterpartyStats | undefined, direction: 'credit' | 'debit'): boolean {
  if (!stats) return false;
  const samples = direction === 'credit' ? stats.creditSamples : stats.debitSamples;
  if (samples.length < 3) return false;
  const gap = direction === 'credit' ? stats.medianCreditGapDays : stats.medianDebitGapDays;
  const spread = direction === 'credit' ? stats.creditAmountSpread : stats.debitAmountSpread;
  return gap != null && gap >= 21 && gap <= 40 && spread <= 0.35;
}

function classifyIncomeKind(tx: ClassifiableTx, stats?: CounterpartyStats): IncomeKind {
  const direction = (tx.direction ?? '').toLowerCase();
  if (direction !== 'credit') return 'NONE';

  const desc = normalizeText(tx.description);
  const raw = normalizeText(tx.rawDescription);

  if (containsKeyword(desc, PAYROLL_KEYWORDS) || containsKeyword(raw, PAYROLL_KEYWORDS)) return 'PAYROLL';
  if (containsKeyword(desc, ALLOWANCE_KEYWORDS) || containsKeyword(raw, ALLOWANCE_KEYWORDS)) return 'ALLOWANCE';
  if (containsKeyword(desc, REFUND_KEYWORDS) || containsKeyword(raw, REFUND_KEYWORDS)) return 'REFUND';
  if (containsKeyword(desc, INTERNAL_TRANSFER_KEYWORDS) || containsKeyword(raw, INTERNAL_TRANSFER_KEYWORDS))
    return 'INTERNAL_TRANSFER';

  if (looksLikeAllowanceP2P(stats)) return 'ALLOWANCE';

  if (containsKeyword(desc, SIDE_GIG_KEYWORDS) || containsKeyword(raw, SIDE_GIG_KEYWORDS)) return 'SIDE_GIG';

  return 'OTHER';
}

function classifyP2PKind(tx: ClassifiableTx, stats?: CounterpartyStats): P2PKind {
  if (!isP2P(tx)) return 'NONE';
  const direction = (tx.direction ?? '').toLowerCase() === 'credit' ? 'credit' : 'debit';
  const desc = normalizeText(tx.description);
  const raw = normalizeText(tx.rawDescription);

  const allowance = looksLikeAllowanceP2P(stats);
  const pseudoMerchant = looksLikePseudoMerchant(stats, direction);

  if (direction === 'credit') {
    if (allowance || containsKeyword(desc, ALLOWANCE_KEYWORDS) || containsKeyword(raw, ALLOWANCE_KEYWORDS)) {
      return 'P2P_ALLOWANCE';
    }
    if (pseudoMerchant || containsKeyword(desc, SERVICE_MEMO_KEYWORDS) || containsKeyword(raw, SERVICE_MEMO_KEYWORDS)) {
      return 'P2P_PSEUDO_MERCHANT_IN';
    }
    return 'P2P_REPAYMENT_IN';
  }

  if (pseudoMerchant || containsKeyword(desc, SERVICE_MEMO_KEYWORDS) || containsKeyword(raw, SERVICE_MEMO_KEYWORDS)) {
    return 'P2P_PSEUDO_MERCHANT_OUT';
  }

  if (containsKeyword(desc, REPAYMENT_MEMO_KEYWORDS) || containsKeyword(raw, REPAYMENT_MEMO_KEYWORDS)) {
    return 'P2P_REPAYMENT_OUT';
  }

  return 'P2P_REPAYMENT_OUT';
}

function normalizeClassification(tx: ClassifiableTx, statsMap: Map<string, CounterpartyStats>): ClassificationResult {
  const key = normalizeCounterpartyKey(tx);
  const stats = statsMap.get(key);
  const incomeKind =
    hasText(tx.incomeKind) && tx.incomeKind !== 'NONE'
      ? (tx.incomeKind as IncomeKind)
      : classifyIncomeKind(tx, stats);
  const p2pKind =
    hasText(tx.p2pKind) && tx.p2pKind !== 'NONE'
      ? (tx.p2pKind as P2PKind)
      : classifyP2PKind(tx, stats);

  return { txId: tx.id, incomeKind, p2pKind };
}

export function classifyTransactionsInMemory(txs: ClassifiableTx[]): ClassificationResult[] {
  const stats = buildCounterpartyStats(txs);
  return txs.map((tx) => normalizeClassification(tx, stats));
}

type ClassificationOpts = {
  persist?: boolean;
  sourceFilter?: string[];
};

export async function classifyIncomeAndP2PForUser(
  userId: string,
  opts?: ClassificationOpts,
): Promise<ClassifiedBankTransaction[]> {
  const txs = await prisma.bankTransaction.findMany({
    where: { userId, ...(opts?.sourceFilter ? { source: { in: opts.sourceFilter } } : {}) },
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

  const classifications = classifyTransactionsInMemory(txs);

  const updates: Prisma.BankTransactionUpdateArgs[] = [];
  if (opts?.persist) {
    if (isProduction()) {
      throw new Error('Income/P2P classification persistence is disabled in production');
    }
    for (const classification of classifications) {
      const tx = txs.find((t) => t.id === classification.txId);
      if (!tx) continue;
      const incomeKindChanged = tx.incomeKind !== classification.incomeKind;
      const p2pKindChanged = tx.p2pKind !== classification.p2pKind;
      if (!incomeKindChanged && !p2pKindChanged) continue;
      updates.push({
        where: { id: tx.id },
        data: {
          incomeKind: toIncomeEnum(classification.incomeKind),
          p2pKind: toP2PEnum(classification.p2pKind),
        },
      });
    }
  }

  if (updates.length > 0) {
    let batches = 0;
    for (let i = 0; i < updates.length; i += 25) {
      const slice = updates.slice(i, i + 25);
      await prisma.$transaction(slice.map((args) => prisma.bankTransaction.update(args)));
      batches += 1;
    }
    console.warn(`Income classification persisted ${updates.length} updates across ${batches} batches`);
  }

  const classificationMap = new Map(classifications.map((c) => [c.txId, c]));
  return txs.map((tx) => {
    const classification = classificationMap.get(tx.id);
    const incomeKind = classification?.incomeKind ?? 'NONE';
    const p2pKind = classification?.p2pKind ?? 'NONE';
    return {
      ...tx,
      incomeKind,
      p2pKind,
    };
  });
}

export function getNetEarnedIncomeCents(kind: IncomeKind, p2pKind: P2PKind, amountMinor: number): number {
  const cents = Math.abs(Number.isFinite(amountMinor) ? Math.trunc(amountMinor) : 0);
  if (kind === 'PAYROLL' || kind === 'ALLOWANCE' || kind === 'SIDE_GIG') return cents;
  if (p2pKind === 'P2P_ALLOWANCE') return cents;
  return 0;
}

export function isRefundLike(kind: IncomeKind, p2pKind: P2PKind): boolean {
  return kind === 'REFUND' || p2pKind === 'P2P_REPAYMENT_IN';
}
