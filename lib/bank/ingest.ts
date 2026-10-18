import { Prisma } from '@prisma/client';
import { prisma, isProduction } from '../prisma.js';
import { logInfo, logWarn } from '../logger.js';
import { asAppError } from '../errors.js';
import { resolveUserIdForExternalIds } from './user-link.js';

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

type MerchantLocation = { city?: string | null; region?: string | null; country?: string | null };

type MerchantObservationKey = {
  safeName: string;
  normalizedMcc: number | null;
  where: { userId: string; merchantName: string; mcc?: number };
};

function merchantObservationKey(
  userId: string,
  merchantName?: string | null,
  mcc?: number | null
): MerchantObservationKey | null {
  const hasMerchantName = hasNonEmptyString(merchantName);
  if (!hasMerchantName && !hasValidNumber(mcc)) return null;
  const safeName = hasMerchantName ? merchantName : 'Unknown merchant';
  const normalizedMcc = typeof mcc === 'number' && Number.isInteger(mcc) ? mcc : null;
  const where = normalizedMcc != null ? { userId, merchantName: safeName, mcc: normalizedMcc } : { userId, merchantName: safeName };
  return { safeName, normalizedMcc, where };
}

async function findOrCreateMerchantObservation(
  userId: string,
  key: MerchantObservationKey,
  location?: MerchantLocation
): Promise<string> {
  const existing = await prisma.merchantObservation.findFirst({
    where: key.where,
    select: { id: true },
  });
  if (existing !== null && existing.id !== '') return existing.id;

  const created = await prisma.merchantObservation.create({
    data: {
      userId,
      merchantName: key.safeName,
      mcc: key.normalizedMcc,
      city: location?.city ?? null,
      region: location?.region ?? null,
      country: location?.country ?? null,
    },
    select: { id: true },
  });
  return created.id;
}

async function upsertMerchantObservation(
  userId: string,
  merchantName?: string | null,
  mcc?: number | null,
  location?: MerchantLocation
): Promise<string | null> {
  const key = merchantObservationKey(userId, merchantName, mcc);
  if (key === null) return null;
  try {
    return await findOrCreateMerchantObservation(userId, key, location);
  } catch (caught: unknown) {
    const appError = asAppError(caught);
    logWarn('bank_ingest_merchant_observation_failed', {
      err: appError,
      userId,
      merchantName: key.safeName,
      mcc,
    });
    return null;
  }
}

function ingestSkipEvent(tx: RawBankTransaction): string | null {
  if (!Number.isFinite(tx.amountCents)) return 'bank_ingest_invalid_amount';
  if (!hasNonEmptyString(tx.accountExternalId)) return 'bank_ingest_missing_account';
  return null;
}

async function resolveIngestUserId(tx: RawBankTransaction): Promise<string | null> {
  const userId = await resolveUserIdForExternalIds({
    accountExternalId: tx.accountExternalId,
    userExternalId: hasNonEmptyString(tx.userExternalId) ? tx.userExternalId : null,
  });
  if (userId === null || userId === '') {
    logWarn('bank_ingest_missing_user', {
      externalId: tx.externalId,
      accountExternalId: tx.accountExternalId,
      userExternalId: tx.userExternalId ?? null,
    });
    return null;
  }
  return userId;
}

function parseIntegerMcc(tx: RawBankTransaction): number | null {
  const mcc = tx.mcc != null ? Number.parseInt(String(tx.mcc), 10) : null;
  return Number.isInteger(mcc) ? (mcc as number) : null;
}

function merchantLocation(tx: RawBankTransaction): Required<MerchantLocation> {
  return {
    city: tx.merchantCity ?? null,
    region: tx.merchantRegion ?? null,
    country: tx.merchantCountry ?? null,
  };
}

function ingestTimestamps(tx: RawBankTransaction): { postedAt: Date; occurredAt: Date } {
  const postedAtSource = tx.postedAt ?? tx.occurredAt;
  const postedAt = new Date(postedAtSource);
  const occurredAt = tx.occurredAt != null ? new Date(tx.occurredAt) : postedAt;
  return { postedAt, occurredAt };
}

function buildIngestData(
  tx: RawBankTransaction,
  userId: string,
  mcc: number | null,
  merchantObservationId: string | null
) {
  const { amount, direction } = normalizeAmount(tx.amountCents);
  const amountMinor = Math.trunc(tx.amountCents);
  const { postedAt, occurredAt } = ingestTimestamps(tx);
  const currency = hasNonEmptyString(tx.currency) ? tx.currency.toUpperCase() : 'USD';
  const rawDescription = typeof tx.raw === 'string' ? tx.raw : tx.description;
  const accountLast4 = hasNonEmptyString(tx.accountExternalId) ? tx.accountExternalId.slice(-4) : null;
  const location = merchantLocation(tx);

  return {
    userId,
    externalId: tx.externalId,
    source: 'dev_simulator',
    accountId: tx.accountExternalId,
    accountLast4,
    cardBrand: null,
    cardLast4: null,
    merchantName: tx.merchantName ?? tx.description ?? null,
    merchantCity: location.city,
    merchantRegion: location.region,
    merchantCountry: location.country,
    mcc,
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
}

async function ingestOne(tx: RawBankTransaction, userId: string, stats: IngestStats): Promise<void> {
  const existing = await prisma.bankTransaction.findUnique({
    where: { userId_externalId: { userId, externalId: tx.externalId } },
    select: { id: true },
  });

  const { direction, absoluteCents } = normalizeAmount(tx.amountCents);
  const mcc = parseIntegerMcc(tx);
  const merchantObservationId = await upsertMerchantObservation(userId, tx.merchantName, mcc, merchantLocation(tx));
  const baseData = buildIngestData(tx, userId, mcc, merchantObservationId);

  if (existing != null) {
    await prisma.bankTransaction.update({
      where: { userId_externalId: { userId, externalId: tx.externalId } },
      data: baseData,
    });
    stats.duplicates += 1;
    return;
  }
  await prisma.bankTransaction.create({ data: baseData });
  stats.ingested += 1;
  logInfo('bank_ingest_created', {
    externalId: tx.externalId,
    userId,
    amountCents: absoluteCents,
    direction,
  });
}

export async function ingestBankTransactions(txs: RawBankTransaction[]): Promise<IngestStats> {
  const stats: IngestStats = { ingested: 0, duplicates: 0, skipped: 0 };

  for (const tx of txs) {
    const skipEvent = ingestSkipEvent(tx);
    if (skipEvent !== null) {
      stats.skipped += 1;
      logWarn(skipEvent, { externalId: tx.externalId });
      continue;
    }

    const userId = await resolveIngestUserId(tx);
    if (userId === null) {
      stats.skipped += 1;
      continue;
    }

    await ingestOne(tx, userId, stats);
  }

  return stats;
}

function deriveAccountId(input: NormalizedBankTransactionInput): string {
  if (hasNonEmptyString(input.accountId)) return input.accountId;
  if (hasNonEmptyString(input.accountLast4)) return `${input.source}-acct-${input.accountLast4}`;
  return `${input.source}-acct`;
}

function upsertSkipEvent(tx: NormalizedBankTransactionInput, postedAt: Date): string | null {
  if (isProduction() && tx.source === 'csv_dev') return 'bank_upsert_rejected_prod_csv';
  if (!Number.isFinite(tx.amountMinor)) return 'bank_upsert_invalid_amount';
  if (!hasNonEmptyString(tx.externalId) || !hasNonEmptyString(tx.userId)) return 'bank_upsert_missing_keys';
  if (Number.isNaN(postedAt.getTime())) return 'bank_upsert_invalid_posted_at';
  return null;
}

function statementFields(tx: NormalizedBankTransactionInput) {
  return {
    rawDescription: tx.rawDescription ?? null,
    sourceStatement: tx.sourceStatement ?? null,
    statementStart: tx.statementStart ?? null,
    statementEnd: tx.statementEnd ?? null,
    section: tx.section ?? null,
  };
}

function buildUpsertData(tx: NormalizedBankTransactionInput, postedAt: Date, amountMinor: number) {
  const { amount, direction } = normalizeAmount(amountMinor, normalizeDirection(tx.direction));
  const occurredAt = postedAt;
  const accountLast4 = hasNonEmptyString(tx.accountLast4) ? tx.accountLast4 : null;
  const statement = statementFields(tx);

  const rawPayload = {
    source: tx.source,
    description: tx.description,
    rawDescription: statement.rawDescription,
    sourceStatement: statement.sourceStatement,
    statementStart: statement.statementStart,
    statementEnd: statement.statementEnd,
    section: statement.section,
  };

  return {
    externalId: tx.externalId,
    userId: tx.userId,
    source: tx.source,
    accountId: deriveAccountId(tx),
    accountLast4,
    merchantName: tx.description,
    description: tx.description,
    rawDescription: statement.rawDescription,
    amountMinor,
    amount,
    currency: 'USD',
    direction,
    transactionType: statement.section,
    section: statement.section,
    isRecurring: false,
    occurredAt,
    postedAt,
    sourceStatement: statement.sourceStatement,
    statementStart: statement.statementStart,
    statementEnd: statement.statementEnd,
    raw: rawPayload,
  };
}

async function upsertOne(tx: NormalizedBankTransactionInput, postedAt: Date, stats: UpsertStats): Promise<void> {
  const amountMinor = Math.trunc(tx.amountMinor);
  const { direction, absoluteCents } = normalizeAmount(amountMinor, normalizeDirection(tx.direction));

  const where = { userId_externalId: { userId: tx.userId, externalId: tx.externalId } };
  const existing = await prisma.bankTransaction.findUnique({ where, select: { id: true } });

  const data = buildUpsertData(tx, postedAt, amountMinor);

  if (existing != null) {
    await prisma.bankTransaction.update({
      where,
      data,
    });
    stats.updated += 1;
    return;
  }
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

export async function upsertBankTransactions(
  txs: NormalizedBankTransactionInput[],
): Promise<UpsertStats> {
  const stats: UpsertStats = { created: 0, updated: 0, skipped: 0 };

  for (const tx of txs) {
    const postedAt = new Date(tx.postedAt);
    const skipEvent = upsertSkipEvent(tx, postedAt);
    if (skipEvent !== null) {
      stats.skipped += 1;
      logWarn(skipEvent, { externalId: tx.externalId, userId: tx.userId });
      continue;
    }

    await upsertOne(tx, postedAt, stats);
  }

  return stats;
}
