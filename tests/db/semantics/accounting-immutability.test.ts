/**
 * PROVES:
 * - A4: Ledger immutability (append-only)
 *
 * PRE-EXISTING TEST (RETROFITTED)
 *
 * ASSUMPTIONS:
 * - DB immutability triggers are authoritative for accounting tables.
 *
 * STATE SPACE:
 * - Varies: mutation attempts (update/delete)
 * - Fixed: accounting transaction/posting schemas
 */
import { PrismaClient } from '@prisma/client';
import { assertCheckViolation } from '../_helpers/assert-db-violation';

const prisma = new PrismaClient();

const EMAIL = 'db-semantics-accounting-immutability@cherry.local';
const TXN_CONSTRAINTS = ['accounting_transaction__immutable__check'] as const;
const POSTING_CONSTRAINTS = ['accounting_posting__immutable__check'] as const;
type PostingRow = Awaited<ReturnType<PrismaClient['accountingPosting']['create']>>;

async function cleanup(userId: string | null): Promise<void> {
  if (userId === null) {
    await prisma.user.deleteMany({ where: { email: EMAIL } });
    await prisma.$disconnect();
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe('SET LOCAL cherry.allow_accounting_mutation = 1');
    await tx.accountingPosting.deleteMany({ where: { transaction: { userId } } });
    await tx.accountingTransaction.deleteMany({ where: { userId } });
    await tx.user.deleteMany({ where: { id: userId } });
  });

  await prisma.user.deleteMany({ where: { email: EMAIL } });
  await prisma.$disconnect();
}

async function run(): Promise<void> {
  let userId: string | null = null;
  let postingId: string | null = null;

  try {
    await prisma.user.deleteMany({ where: { email: EMAIL } });
    const user = await prisma.user.create({ data: { email: EMAIL } });
    userId = user.id;

    const txn = await prisma.accountingTransaction.create({
      data: {
        userId,
        currency: 'USD',
        txnType: 'SPEND',
        effectiveAt: new Date('2024-01-01T00:00:00Z'),
        externalId: 'immutability-txn',
      },
    });
    const postings = await prisma.$transaction(async (tx): Promise<PostingRow[]> => {
      const debit = await tx.accountingPosting.create({
        data: {
          transactionId: txn.id,
          accountId: 'EXPENSE:OTHER',
          accountType: 'EXPENSE',
          role: 'SINK',
          amount: 500,
          currency: 'USD',
        },
      });
      const credit = await tx.accountingPosting.create({
        data: {
          transactionId: txn.id,
          accountId: 'ASSET:CASH',
          accountType: 'ASSET',
          role: 'SOURCE',
          amount: -500,
          currency: 'USD',
        },
      });
      return [debit, credit];
    });

    postingId = postings[0]?.id ?? null;

    let updateTxnError: unknown = null;
    try {
      await prisma.accountingTransaction.update({
        where: { id: txn.id },
        data: { txnType: 'REFUND' },
      });
    } catch (err) {
      updateTxnError = err;
    }

    if (updateTxnError === null) {
      throw new Error('Expected accounting transaction update to be rejected');
    }
    assertCheckViolation(updateTxnError, TXN_CONSTRAINTS);

    let deleteTxnError: unknown = null;
    try {
      await prisma.accountingTransaction.delete({ where: { id: txn.id } });
    } catch (err) {
      deleteTxnError = err;
    }

    if (deleteTxnError === null) {
      throw new Error('Expected accounting transaction delete to be rejected');
    }
    assertCheckViolation(deleteTxnError, TXN_CONSTRAINTS);

    if (postingId !== null) {
      let updatePostingError: unknown = null;
      try {
        await prisma.accountingPosting.update({
          where: { id: postingId },
          data: { amount: 600 },
        });
      } catch (err) {
        updatePostingError = err;
      }

      if (updatePostingError === null) {
        throw new Error('Expected accounting posting update to be rejected');
      }
      assertCheckViolation(updatePostingError, POSTING_CONSTRAINTS);

      let deletePostingError: unknown = null;
      try {
        await prisma.accountingPosting.delete({ where: { id: postingId } });
      } catch (err) {
        deletePostingError = err;
      }

      if (deletePostingError === null) {
        throw new Error('Expected accounting posting delete to be rejected');
      }
      assertCheckViolation(deletePostingError, POSTING_CONSTRAINTS);
    }

    console.warn('db-semantics-accounting-immutability: ok');
  } finally {
    await cleanup(userId);
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
