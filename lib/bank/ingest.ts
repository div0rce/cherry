import { Prisma } from '@prisma/client';
import { prisma, isProduction } from '@/lib/prisma';
import { logInfo, logWarn } from '@/lib/logger';
import { asError } from '@/lib/errors';
import { resolveUserIdForExternalIds } from './user-link';

function hasNonEmptyString(value?: string | null): value is string {
  return value !== undefined && value !== null && value !== '';
}

function hasValidNumber(value?: number | null): value is number {
  return value !== undefined && value !== null && !Number.isNaN(value);
}

export type RawBankTransaction = {
  externalId: string;
  accountExternalId: string;
  userExternalId?: string | null | undefined;
  amountCents: number;
  currency: string;
  occurredAt: Date;
  postedAt?: Date | null | undefined;
  description: string;
  merchantName?: string | null | undefined;
  mcc?: string | number | null | undefined;
  merchantCity?: string | null | undefined;
  merchantRegion?: string | null | undefined;
  merchantCountry?: string | null | undefined;
  raw?: unknown;
};

export type NormalizedBankTransactionInput = {
  userId: string;
  externalId: string;
  postedAt: Date;
  amountMinor: number;
  direction: 'debit' | 'credit';
  description: string;
  rawDescription?: string | null;
  accountLast4?: string | null;
  source: 'csv_dev' | 'dev_simulator' | 'plaid' | 'teller' | string;
  sourceStatement?: string | null;
  statementStart?: string | null;
  statementEnd?: string | null;
  section?: string | null;
  accountId?: string | null;
};

type IngestStats = {
  ingested: number;
  duplicates: number;
  skipped: number;
};

type UpsertStats = {
  created: number;
  updated: number;
  skipped: number;
};

function normalizeDirection(direction: string | null | undefined): 'CREDIT' | 'DEBIT' {
  if (typeof direction !== 'string') return 'DEBIT';
  return direction.toLowerCase() === 'credit' ? 'CREDIT' : 'DEBIT';
}

function normalizeAmount(
  amountCents: number,
  directionOverride?: 'CREDIT' | 'DEBIT',
): {
  amount: Prisma.Decimal;
  direction: 'CREDIT' | 'DEBIT';
  absoluteCents: number;
} {
  const normalizedDirection: 'CREDIT' | 'DEBIT' =
    directionOverride ?? (amountCents < 0 ? 'CREDIT' : 'DEBIT');
  const normalizedCents = Math.trunc(amountCents);
  const absoluteCents = Math.abs(normalizedCents);
  const amount = new Prisma.Decimal(absoluteCents).dividedBy(new Prisma.Decimal(100));
  return { amount, direction: normalizedDirection, absoluteCents };
}

async function upsertMerchantObservation(
  userId: string,
  merchantName?: string | null,
  mcc?: number | null,
  location?: { city?: string | null; region?: string | null; country?: string | null }
): Promise<string | null> {
  const hasMerchantName = hasNonEmptyString(merchantName);
  const hasMcc = hasValidNumber(mcc);
  if (!hasMerchantName && !hasMcc) return null;
  const safeName = hasMerchantName ? merchantName : 'Unknown merchant';
  const normalizedMcc = typeof mcc === 'number' && Number.isInteger(mcc) ? mcc : null;
  const where = normalizedMcc != null ? { userId, merchantName: safeName, mcc: normalizedMcc } : { userId, merchantName: safeName };
  try {
    const existing = await prisma.merchantObservation.findFirst({
      where,
      select: { id: true },
    });
    if (existing !== null && existing.id !== '') return existing.id;

    const created = await prisma.merchantObservation.create({
      data: {
        userId,
        merchantName: safeName,
        mcc: normalizedMcc,
        city: location?.city ?? null,
        region: location?.region ?? null,
        country: location?.country ?? null,
      },
      select: { id: true },
    });
    return created.id;
  } catch (caught) {
    asError(caught);
    logWarn('bank_ingest_merchant_observation_failed', { err: caught, userId, merchantName: safeName, mcc });
    return null;
  }
}

export async function ingestBankTransactions(txs: RawBankTransaction[]): Promise<IngestStats> {
  const stats: IngestStats = { ingested: 0, duplicates: 0, skipped: 0 };

  for (const tx of txs) {
    if (!Number.isFinite(tx.amountCents)) {
      stats.skipped += 1;
      logWarn('bank_ingest_invalid_amount', { externalId: tx.externalId });
      continue;
    }

    if (!hasNonEmptyString(tx.accountExternalId)) {
      stats.skipped += 1;
      logWarn('bank_ingest_missing_account', { externalId: tx.externalId });
      continue;
    }

    const userId = await resolveUserIdForExternalIds({
      accountExternalId: tx.accountExternalId,
      userExternalId: hasNonEmptyString(tx.userExternalId) ? tx.userExternalId : null,
    });

    if (userId === null || userId === '') {
      stats.skipped += 1;
      logWarn('bank_ingest_missing_user', {
        externalId: tx.externalId,
        accountExternalId: tx.accountExternalId,
        userExternalId: tx.userExternalId ?? null,
      });
      continue;
    }

    const existing = await prisma.bankTransaction.findUnique({
      where: { userId_externalId: { userId, externalId: tx.externalId } },
      select: { id: true },
    });

    const { amount, direction, absoluteCents } = normalizeAmount(tx.amountCents);
    const amountMinor = Math.trunc(tx.amountCents);
    const postedAtSource = tx.postedAt ?? tx.occurredAt;
    const postedAt = new Date(postedAtSource);
    const occurredAt = tx.occurredAt != null ? new Date(tx.occurredAt) : postedAt;
    const currency = hasNonEmptyString(tx.currency) ? tx.currency.toUpperCase() : 'USD';
    const mcc = tx.mcc != null ? Number.parseInt(String(tx.mcc), 10) : null;
    const rawDescription = typeof tx.raw === 'string' ? tx.raw : tx.description;
    const accountLast4 = hasNonEmptyString(tx.accountExternalId) ? tx.accountExternalId.slice(-4) : null;

    const merchantObservationId = await upsertMerchantObservation(
      userId,
      tx.merchantName,
      Number.isInteger(mcc) ? (mcc as number) : null,
      {
        city: tx.merchantCity ?? null,
        region: tx.merchantRegion ?? null,
        country: tx.merchantCountry ?? null,
      }
    );

    const baseData = {
      userId,
      externalId: tx.externalId,
      source: 'dev_simulator',
      accountId: tx.accountExternalId,
      accountLast4,
      cardBrand: null,
      cardLast4: null,
      merchantName: tx.merchantName ?? tx.description ?? null,
      merchantCity: tx.merchantCity ?? null,
      merchantRegion: tx.merchantRegion ?? null,
      merchantCountry: tx.merchantCountry ?? null,
      mcc: Number.isInteger(mcc) ? (mcc as number) : null,
      description: tx.description,
      rawDescription,
      amountMinor,
      amount,
      currency,
      direction,
      transactionType: null,
      section: null,
      sourceStatement: null,
      statementStart: null,
      statementEnd: null,
      isRecurring: false,
      occurredAt,
      postedAt,
      raw: tx.raw ?? { description: tx.description, amountCents: tx.amountCents, postedAt: tx.postedAt ?? null },
      ...(hasNonEmptyString(merchantObservationId) ? { merchantObservationId } : {}),
    };

    if (existing != null) {
      await prisma.bankTransaction.update({
        where: { userId_externalId: { userId, externalId: tx.externalId } },
        data: baseData,
      });
      stats.duplicates += 1;
    } else {
      await prisma.bankTransaction.create({ data: baseData });
      stats.ingested += 1;
      logInfo('bank_ingest_created', {
        externalId: tx.externalId,
        userId,
        amountCents: absoluteCents,
        direction,
      });
    }
  }

  return stats;
}

function deriveAccountId(input: NormalizedBankTransactionInput): string {
  if (hasNonEmptyString(input.accountId)) return input.accountId;
  if (hasNonEmptyString(input.accountLast4)) return `${input.source}-acct-${input.accountLast4}`;
  return `${input.source}-acct`;
}

export async function upsertBankTransactions(
  txs: NormalizedBankTransactionInput[],
): Promise<UpsertStats> {
  const stats: UpsertStats = { created: 0, updated: 0, skipped: 0 };

  for (const tx of txs) {
    if (isProduction() && tx.source === 'csv_dev') {
      stats.skipped += 1;
      logWarn('bank_upsert_rejected_prod_csv', { externalId: tx.externalId, userId: tx.userId });
      continue;
    }

    if (!Number.isFinite(tx.amountMinor)) {
      stats.skipped += 1;
      logWarn('bank_upsert_invalid_amount', { externalId: tx.externalId, userId: tx.userId });
      continue;
    }

    if (!hasNonEmptyString(tx.externalId) || !hasNonEmptyString(tx.userId)) {
      stats.skipped += 1;
      logWarn('bank_upsert_missing_keys', { externalId: tx.externalId, userId: tx.userId });
      continue;
    }

    const postedAt = new Date(tx.postedAt);
    if (Number.isNaN(postedAt.getTime())) {
      stats.skipped += 1;
      logWarn('bank_upsert_invalid_posted_at', { externalId: tx.externalId, userId: tx.userId });
      continue;
    }

    const normalizedDirection = normalizeDirection(tx.direction);
    const amountMinor = Math.trunc(tx.amountMinor);
    const { amount, direction, absoluteCents } = normalizeAmount(amountMinor, normalizedDirection);
    const occurredAt = postedAt;
    const accountId = deriveAccountId(tx);
    const accountLast4 = hasNonEmptyString(tx.accountLast4) ? tx.accountLast4 : null;

    const rawPayload = {
      source: tx.source,
      description: tx.description,
      rawDescription: tx.rawDescription ?? null,
      sourceStatement: tx.sourceStatement ?? null,
      statementStart: tx.statementStart ?? null,
      statementEnd: tx.statementEnd ?? null,
      section: tx.section ?? null,
    };

    const where = { userId_externalId: { userId: tx.userId, externalId: tx.externalId } };
    const existing = await prisma.bankTransaction.findUnique({ where, select: { id: true } });

    const data = {
      externalId: tx.externalId,
      userId: tx.userId,
      source: tx.source,
      accountId,
      accountLast4,
      merchantName: tx.description,
      description: tx.description,
      rawDescription: tx.rawDescription ?? null,
      amountMinor,
      amount,
      currency: 'USD',
      direction,
      transactionType: tx.section ?? null,
      section: tx.section ?? null,
      isRecurring: false,
      occurredAt,
      postedAt,
      sourceStatement: tx.sourceStatement ?? null,
      statementStart: tx.statementStart ?? null,
      statementEnd: tx.statementEnd ?? null,
      raw: rawPayload,
    };

    if (existing != null) {
      await prisma.bankTransaction.update({
        where,
        data,
      });
      stats.updated += 1;
    } else {
      await prisma.bankTransaction.create({ data });
      stats.created += 1;
      logInfo('bank_upsert_created', {
        externalId: tx.externalId,
        userId: tx.userId,
        amountCents: absoluteCents,
        direction,
        source: tx.source,
      });
    }
  }

  return stats;
}
