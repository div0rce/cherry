import { Prisma } from '@prisma/client';
import { prisma } from '../prisma.js';
import { assertUserId } from '../invariants.js';
import { isPrismaP2003, logInvariant } from '../user-context.js';
import { asError } from '../errors.js';
import { hasText } from '../text.js';

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
    const amountDecimal = new Prisma.Decimal(tx.amount);
    const centsFromAmount = Math.trunc(amountDecimal.mul(100).toNumber());
    const absoluteCents = Math.abs(centsFromAmount);
    const amount = new Prisma.Decimal(absoluteCents).dividedBy(new Prisma.Decimal(100));
    const amountMinor = (tx.direction === 'CREDIT' ? 1 : -1) * absoluteCents;
    const merchantName: string | null = hasText(tx.merchantName) ? tx.merchantName : null;
    const mcc: number | null =
      typeof tx.mcc === 'number' && !Number.isNaN(tx.mcc) ? tx.mcc : null;
    const hasMerchantName = merchantName !== null;
    const hasMcc = mcc !== null;

    const merchantObservation =
      hasMerchantName || hasMcc
        ? await prisma.merchantObservation.upsert({
            where: {
              userId_merchantName_mcc: {
                userId: tx.userId,
                merchantName: merchantName ?? 'UNKNOWN',
                mcc: mcc ?? 0,
              },
            },
            update: {
              merchantName,
              mcc,
              city: tx.merchantCity ?? null,
              region: tx.merchantRegion ?? null,
              country: tx.merchantCountry ?? null,
              updatedAt: tx.occurredAt,
            },
            create: {
              userId: tx.userId,
              merchantName: merchantName ?? 'UNKNOWN',
              mcc,
              city: tx.merchantCity ?? null,
              region: tx.merchantRegion ?? null,
              country: tx.merchantCountry ?? null,
            },
          })
        : null;

    const where = { userId_externalId: { userId: tx.userId, externalId: tx.id } };
    const data = {
      externalId: tx.id,
      userId: tx.userId,
      accountId: tx.accountId,
      source: 'aggregator',
      merchantName,
      merchantCity: tx.merchantCity ?? null,
      merchantRegion: tx.merchantRegion ?? null,
      merchantCountry: tx.merchantCountry ?? null,
      mcc,
      description: merchantName ?? null,
      amount,
      amountMinor,
      currency: tx.currency,
      direction: tx.direction,
      transactionType: tx.transactionType ?? null,
      section: tx.transactionType ?? null,
      isRecurring: tx.isRecurring ?? null,
      occurredAt: tx.occurredAt,
      postedAt: tx.occurredAt,
      sourceStatement: null,
      statementStart: null,
      statementEnd: null,
      raw: tx.raw == null ? Prisma.JsonNull : (tx.raw as Prisma.InputJsonValue),
      merchantObservationId: merchantObservation?.id ?? null,
      cardBrand: tx.cardBrand ?? null,
      cardLast4: tx.cardLast4 ?? null,
    };

    const existing = await prisma.bankTransaction.findUnique({ where, select: { id: true } });

    if (existing) {
      await prisma.bankTransaction.update({ where, data });
    } else {
      await prisma.bankTransaction.create({ data });
    }
  } catch (err: unknown) {
    asError(err);
    if (isPrismaP2003(err)) {
      logInvariant('P2003 in ingestBankTransaction', {
        userId: tx.userId,
        err,
      });
    } else {
      logInvariant('Error in ingestBankTransaction', { userId: tx.userId, err });
    }
    throw err;
  }
}
