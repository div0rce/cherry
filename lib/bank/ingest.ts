import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { logInfo, logWarn } from '@/lib/logger';
import { resolveUserIdForExternalIds } from './user-link';

export type RawBankTransaction = {
  externalId: string;
  accountExternalId: string;
  userExternalId?: string | null;
  amountCents: number;
  currency: string;
  occurredAt: Date;
  postedAt?: Date | null;
  description: string;
  merchantName?: string | null;
  mcc?: string | null;
  merchantCity?: string | null;
  merchantRegion?: string | null;
  merchantCountry?: string | null;
  raw?: unknown;
};

type IngestStats = {
  ingested: number;
  duplicates: number;
  skipped: number;
};

function normalizeAmount(amountCents: number): {
  amount: Prisma.Decimal;
  direction: 'CREDIT' | 'DEBIT';
  absoluteCents: number;
} {
  const direction: 'CREDIT' | 'DEBIT' = amountCents < 0 ? 'CREDIT' : 'DEBIT';
  const absoluteCents = Math.abs(Math.floor(amountCents));
  const amount = new Prisma.Decimal(absoluteCents).dividedBy(new Prisma.Decimal(100));
  return { amount, direction, absoluteCents };
}

async function upsertMerchantObservation(
  userId: string,
  merchantName?: string | null,
  mcc?: number | null,
  location?: { city?: string | null; region?: string | null; country?: string | null }
): Promise<string | null> {
  if (!merchantName && !mcc) return null;
  const safeName = merchantName ?? 'Unknown merchant';
  try {
    const existing = await prisma.merchantObservation.findFirst({
      where: { userId, merchantName: safeName, mcc: mcc ?? undefined },
      select: { id: true },
    });
    if (existing?.id) return existing.id;

    const created = await prisma.merchantObservation.create({
      data: {
        userId,
        merchantName: safeName,
        mcc: mcc ?? null,
        city: location?.city ?? null,
        region: location?.region ?? null,
        country: location?.country ?? null,
      },
      select: { id: true },
    });
    return created.id;
  } catch (err) {
    logWarn('bank_ingest_merchant_observation_failed', { err, userId, merchantName: safeName, mcc });
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

    const userId = await resolveUserIdForExternalIds({
      accountExternalId: tx.accountExternalId,
      userExternalId: tx.userExternalId ?? null,
    });

    if (!userId) {
      stats.skipped += 1;
      logWarn('bank_ingest_missing_user', {
        externalId: tx.externalId,
        accountExternalId: tx.accountExternalId,
        userExternalId: tx.userExternalId ?? null,
      });
      continue;
    }

    const existing = await prisma.bankTransaction.findUnique({
      where: { id: tx.externalId },
      select: { id: true },
    });

    const { amount, direction, absoluteCents } = normalizeAmount(tx.amountCents);
    const occurredAt = new Date(tx.occurredAt);
    const postedAt = tx.postedAt ? new Date(tx.postedAt) : null;
    const currency = tx.currency?.toUpperCase() ?? 'USD';
    const mcc = tx.mcc != null ? Number.parseInt(String(tx.mcc), 10) : null;

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

    await prisma.bankTransaction.upsert({
      where: { id: tx.externalId },
      create: {
        id: tx.externalId,
        userId,
        accountId: tx.accountExternalId,
        cardBrand: null,
        cardLast4: null,
        merchantName: tx.merchantName ?? null,
        merchantCity: tx.merchantCity ?? null,
        merchantRegion: tx.merchantRegion ?? null,
        merchantCountry: tx.merchantCountry ?? null,
        mcc: Number.isInteger(mcc) ? (mcc as number) : null,
        amount,
        currency,
        direction,
        transactionType: null,
        isRecurring: false,
        occurredAt,
        raw: tx.raw ?? { description: tx.description, amountCents: tx.amountCents },
        ...(postedAt ? { postedAt } : {}),
        ...(merchantObservationId ? { merchantObservationId } : {}),
      },
      update: {
        userId,
        accountId: tx.accountExternalId,
        merchantName: tx.merchantName ?? null,
        merchantCity: tx.merchantCity ?? null,
        merchantRegion: tx.merchantRegion ?? null,
        merchantCountry: tx.merchantCountry ?? null,
        mcc: Number.isInteger(mcc) ? (mcc as number) : null,
        amount,
        currency,
        direction,
        occurredAt,
        ...(postedAt ? { postedAt } : { postedAt: null }),
        raw: tx.raw ?? { description: tx.description, amountCents: tx.amountCents },
        ...(merchantObservationId ? { merchantObservationId } : {}),
      },
    });

    if (existing) {
      stats.duplicates += 1;
    } else {
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
