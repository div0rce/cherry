/**
 * PROVES:
 * - A5: Deterministic replay
 * - A9: Materialized == replayed
 * - A1: Conservation of value
 *
 * PRE-EXISTING TEST (RETROFITTED)
 *
 * ASSUMPTIONS:
 * - DB rows represent committed accounting transactions and postings.
 *
 * STATE SPACE:
 * - Varies: DB materialized rows
 * - Fixed: ledger currency, posting roles
 */
import * as assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';
import {
  applyLedgerEvent,
  asAccountId,
  asCurrency,
  asNonZeroAmount,
  asTxnId,
  balancePostings,
  createLedgerState,
  createTransaction,
  validateLedgerState,
  type Account,
  type Posting,
  type PostingRole,
  type TxnType,
} from '../../../lib/accounting/ledger.js';

const prisma = new PrismaClient();

const EMAIL = 'db-semantics-accounting-replay@cherry.local';

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

function normalizeAccountType(value: string): Account['type'] {
  if (value === 'ASSET' || value === 'EXPENSE' || value === 'INCOME' || value === 'LIABILITY' || value === 'EQUITY') {
    return value;
  }
  throw new Error(`Unknown account type: ${value}`);
}

async function run(): Promise<void> {
  let userId: string | null = null;

  try {
    await prisma.user.deleteMany({ where: { email: EMAIL } });
    const user = await prisma.user.create({ data: { email: EMAIL } });
    userId = user.id;

    const spendTxn = await prisma.accountingTransaction.create({
      data: {
        userId,
        currency: 'USD',
        txnType: 'SPEND',
        effectiveAt: new Date('2024-01-01T00:00:00Z'),
        externalId: 'replay-spend',
      },
    });
    await prisma.$transaction(async (tx) => {
      await tx.accountingPosting.create({
        data: {
          transactionId: spendTxn.id,
          accountId: 'EXPENSE:OTHER',
          accountType: 'EXPENSE',
          role: 'SINK',
          amount: 2500,
          currency: 'USD',
        },
      });
      await tx.accountingPosting.create({
        data: {
          transactionId: spendTxn.id,
          accountId: 'ASSET:CASH',
          accountType: 'ASSET',
          role: 'SOURCE',
          amount: -2500,
          currency: 'USD',
        },
      });
    });

    const incomeTxn = await prisma.accountingTransaction.create({
      data: {
        userId,
        currency: 'USD',
        txnType: 'INCOME',
        effectiveAt: new Date('2024-01-02T00:00:00Z'),
        externalId: 'replay-income',
      },
    });
    await prisma.$transaction(async (tx) => {
      await tx.accountingPosting.create({
        data: {
          transactionId: incomeTxn.id,
          accountId: 'ASSET:CASH',
          accountType: 'ASSET',
          role: 'SINK',
          amount: 5000,
          currency: 'USD',
        },
      });
      await tx.accountingPosting.create({
        data: {
          transactionId: incomeTxn.id,
          accountId: 'INCOME:PRIMARY',
          accountType: 'INCOME',
          role: 'OFFSET',
          amount: -5000,
          currency: 'USD',
        },
      });
    });

    const dbTxns = await prisma.accountingTransaction.findMany({
      where: { userId },
      include: { postings: true },
      orderBy: { effectiveAt: 'asc' },
    });

    const accountsMap = new Map<string, Account>();
    for (const txn of dbTxns) {
      for (const posting of txn.postings) {
        if (!accountsMap.has(posting.accountId)) {
          accountsMap.set(posting.accountId, {
            id: asAccountId(posting.accountId),
            type: normalizeAccountType(posting.accountType),
            currency: asCurrency(posting.currency),
            noOverdraft: false,
          });
        }
      }
    }

    const accounts = Array.from(accountsMap.values());
    const ledgerCurrency = asCurrency('USD');
    let ledger = createLedgerState(accounts, ledgerCurrency);

    for (const txn of dbTxns) {
      const postings: Posting[] = txn.postings.map((posting) => ({
        accountId: asAccountId(posting.accountId),
        amount: asNonZeroAmount(Number(posting.amount)),
        currency: asCurrency(posting.currency),
        role: posting.role as PostingRole,
      }));
      const created = createTransaction(
        {
          id: asTxnId(txn.id),
          type: txn.txnType as TxnType,
          postings: balancePostings(postings),
          effectiveAtMs: txn.effectiveAt.getTime(),
          externalId: txn.externalId,
        },
        ledger
      );
      ledger = applyLedgerEvent(ledger, { type: 'TXN', txn: created });
    }

    const violations = validateLedgerState(ledger);
    assert.equal(violations.length, 0, `expected replay invariants, got ${JSON.stringify(violations)}`);

    const dbBalances = await prisma.$queryRawUnsafe<
      Array<{ accountId: string; balance: number }>
    >(
      'SELECT \"accountId\", SUM(\"amount\")::int AS balance FROM \"AccountingPosting\" WHERE \"transactionId\" IN (SELECT \"id\" FROM \"AccountingTransaction\" WHERE \"userId\" = $1) GROUP BY \"accountId\"',
      userId
    );
    const dbByAccount = new Map<string, number>();
    for (const row of dbBalances) {
      dbByAccount.set(row.accountId, Number(row.balance));
    }

    for (const [accountId, balance] of ledger.balances.entries()) {
      const expected = dbByAccount.get(accountId) ?? 0;
      assert.equal(
        balance,
        expected,
        `balance mismatch for ${accountId}: replay=${balance} db=${expected}`
      );
    }

    console.warn('db-semantics-accounting-replay: ok');
  } finally {
    await cleanup(userId);
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
