import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { assertUserId } from '@/lib/invariants';
import { isPrismaP2003, logInvariant } from '@/lib/user-context';

export interface AggregatorTransaction {
  id: string;
  userId: string;
  accountId: string;
  amount: number;
  currency: string;
  merchantName?: string | null;
  merchantCity?: string | null;
  merchantRegion?: string | null;
  merchantCountry?: string | null;
  mcc?: number | null;
  cardBrand?: string | null;
  cardLast4?: string | null;
  direction: 'DEBIT' | 'CREDIT';
  transactionType?: string | null;
  isRecurring?: boolean | null;
  occurredAt: Date;
  raw?: unknown;
}

/**
 * Normalize and upsert a bank transaction from an aggregator feed.
 * This intentionally avoids sensitive cardholder data (no PAN/CVV/PIN/track).
 */
export async function ingestBankTransaction(tx: AggregatorTransaction): Promise<void> {
  assertUserId(tx.userId, 'ingestBankTransaction userId');

  try {
    const merchantObservation =
      tx.merchantName || tx.mcc
        ? await prisma.merchantObservation.upsert({
            where: {
              userId_merchantName_mcc: {
                userId: tx.userId,
                merchantName: tx.merchantName ?? 'UNKNOWN',
                mcc: tx.mcc ?? 0,
              },
            },
            update: {
              merchantName: tx.merchantName ?? null,
              mcc: tx.mcc ?? null,
              city: tx.merchantCity ?? null,
              region: tx.merchantRegion ?? null,
              country: tx.merchantCountry ?? null,
              updatedAt: new Date(),
            },
            create: {
              userId: tx.userId,
              merchantName: tx.merchantName ?? 'UNKNOWN',
              mcc: tx.mcc ?? null,
              city: tx.merchantCity ?? null,
              region: tx.merchantRegion ?? null,
              country: tx.merchantCountry ?? null,
            },
          })
        : null;

    await prisma.bankTransaction.upsert({
      where: { id: tx.id },
      update: {
        merchantName: tx.merchantName ?? null,
        merchantCity: tx.merchantCity ?? null,
        merchantRegion: tx.merchantRegion ?? null,
        merchantCountry: tx.merchantCountry ?? null,
        mcc: tx.mcc ?? null,
        amount: tx.amount,
        currency: tx.currency,
        direction: tx.direction,
        transactionType: tx.transactionType ?? null,
        isRecurring: tx.isRecurring ?? null,
        occurredAt: tx.occurredAt,
        raw: tx.raw == null ? Prisma.JsonNull : (tx.raw as Prisma.InputJsonValue),
        merchantObservationId: merchantObservation?.id ?? null,
        cardBrand: tx.cardBrand ?? null,
        cardLast4: tx.cardLast4 ?? null,
      },
      create: {
        id: tx.id,
        userId: tx.userId,
        accountId: tx.accountId,
        merchantName: tx.merchantName ?? null,
        merchantCity: tx.merchantCity ?? null,
        merchantRegion: tx.merchantRegion ?? null,
        merchantCountry: tx.merchantCountry ?? null,
        mcc: tx.mcc ?? null,
        amount: tx.amount,
        currency: tx.currency,
        direction: tx.direction,
        transactionType: tx.transactionType ?? null,
        isRecurring: tx.isRecurring ?? null,
        occurredAt: tx.occurredAt,
        raw: tx.raw == null ? Prisma.JsonNull : (tx.raw as Prisma.InputJsonValue),
        merchantObservationId: merchantObservation?.id ?? null,
        cardBrand: tx.cardBrand ?? null,
        cardLast4: tx.cardLast4 ?? null,
      },
    });
  } catch (err: unknown) {
    if (isPrismaP2003(err)) {
      logInvariant('P2003 in ingestBankTransaction', {
        userId: tx.userId,
        meta: err.meta,
      });
    } else {
      logInvariant('Error in ingestBankTransaction', { userId: tx.userId, err });
    }
    throw err;
  }
}
