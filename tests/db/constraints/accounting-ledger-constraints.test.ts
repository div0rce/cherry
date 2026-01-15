import * as assert from 'node:assert/strict';
import { Prisma, PrismaClient } from '@prisma/client';
import { assertPrismaError, getPrismaMetaString } from '../_helpers/assert-prisma-error';

const prisma = new PrismaClient();

const NOT_NULL_CONSTRAINTS = [
  'NOT_NULL:6cb245befb67',
  'NOT_NULL:86e9e67a8532',
  'NOT_NULL:44d96067e325',
  'NOT_NULL:eada0eabd06f',
  'NOT_NULL:9246be19f472',
  'NOT_NULL:9b5208e63185',
  'NOT_NULL:8cf4520b0407',
  'NOT_NULL:c7342c62be0d',
  'NOT_NULL:be1a79f6f7f7',
  'NOT_NULL:033a3d72d6a0',
  'NOT_NULL:0284ab07ea68',
  'NOT_NULL:f55afe9f4e60',
  'NOT_NULL:fe244fbba7e2',
  'NOT_NULL:d8cca653c8e2',
] as const;

void NOT_NULL_CONSTRAINTS;

const EMAIL = 'db-constraints-accounting@cherry.local';
const UNIQUE_CONSTRAINT = 'accounting_transaction__user_id_external_id__unique';
const FK_USER = 'accounting_transaction__user_id__fk';
const FK_TXN = 'accounting_posting__transaction_id__fk';
const CHECK_AMOUNT = 'accounting_posting__amount__check';
const CHECK_CURRENCY = 'accounting_posting__currency__check';
const CHECK_BALANCE = 'accounting_posting__transaction_id__check';

async function cleanup(userId: string | null): Promise<void> {
  if (userId === null) {
    await prisma.user.deleteMany({ where: { email: EMAIL } });
    await prisma.$disconnect();
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe('SET LOCAL cherry.allow_accounting_mutation = 1');
    await tx.accountingPosting.deleteMany({
      where: {
        transaction: { userId },
      },
    });
    await tx.accountingTransaction.deleteMany({ where: { userId } });
    await tx.user.deleteMany({ where: { id: userId } });
  });

  await prisma.user.deleteMany({ where: { email: EMAIL } });
  await prisma.$disconnect();
}

async function run(): Promise<void> {
  let userId: string | null = null;

  try {
    await prisma.user.deleteMany({ where: { email: EMAIL } });
    const user = await prisma.user.create({ data: { email: EMAIL } });
    userId = user.id;

    const baseTxn = await prisma.accountingTransaction.create({
      data: {
        userId,
        currency: 'USD',
        txnType: 'SPEND',
        effectiveAt: new Date('2024-01-01T00:00:00Z'),
        externalId: 'dup-external',
      },
    });
    let uniqueError: unknown = null;
    try {
      await prisma.accountingTransaction.create({
        data: {
          userId,
          currency: 'USD',
          txnType: 'SPEND',
          effectiveAt: new Date('2024-01-01T00:00:00Z'),
          externalId: 'dup-external',
        },
      });
    } catch (err) {
      uniqueError = err;
    }

    if (uniqueError === null) {
      throw new Error('Expected unique constraint violation on accounting externalId');
    }
    assertPrismaError(uniqueError);
    if (uniqueError instanceof Prisma.PrismaClientKnownRequestError) {
      assert.equal(uniqueError.code, 'P2002', 'expected unique constraint error');
      const constraint = getPrismaMetaString(uniqueError, 'constraint');
      if (constraint !== undefined) {
        assert.equal(constraint, UNIQUE_CONSTRAINT);
      }
    } else if (uniqueError instanceof Prisma.PrismaClientUnknownRequestError) {
      assert.ok(
        String(uniqueError).includes(UNIQUE_CONSTRAINT),
        'expected unique constraint name'
      );
    } else {
      throw new Error(`Expected Prisma client error, got ${String(uniqueError)}`);
    }

    let fkUserError: unknown = null;
    try {
      await prisma.accountingTransaction.create({
        data: {
          userId: 'missing-user',
          currency: 'USD',
          txnType: 'SPEND',
          effectiveAt: new Date('2024-01-01T00:00:00Z'),
          externalId: 'missing-user',
        },
      });
    } catch (err) {
      fkUserError = err;
    }

    if (fkUserError === null) {
      throw new Error('Expected foreign key violation on accounting transaction user');
    }
    assertPrismaError(fkUserError);
    if (fkUserError instanceof Prisma.PrismaClientKnownRequestError) {
      assert.equal(fkUserError.code, 'P2003', 'expected foreign key violation');
      const fieldName = getPrismaMetaString(fkUserError, 'field_name');
      if (fieldName !== undefined) {
        assert.ok(fieldName.includes(FK_USER));
      }
    } else if (fkUserError instanceof Prisma.PrismaClientUnknownRequestError) {
      assert.ok(String(fkUserError).includes(FK_USER));
    } else {
      throw new Error(`Expected Prisma client error, got ${String(fkUserError)}`);
    }

    let fkTxnError: unknown = null;
    try {
      await prisma.accountingPosting.create({
        data: {
          transactionId: 'missing-txn',
          accountId: 'ASSET:CASH',
          accountType: 'ASSET',
          role: 'SOURCE',
          amount: 100,
          currency: 'USD',
        },
      });
    } catch (err) {
      fkTxnError = err;
    }

    if (fkTxnError === null) {
      throw new Error('Expected foreign key violation on accounting posting transaction');
    }
    assertPrismaError(fkTxnError);
    if (fkTxnError instanceof Prisma.PrismaClientKnownRequestError) {
      assert.equal(fkTxnError.code, 'P2003', 'expected foreign key violation');
      const fieldName = getPrismaMetaString(fkTxnError, 'field_name');
      if (fieldName !== undefined) {
        assert.ok(fieldName.includes(FK_TXN));
      }
    } else if (fkTxnError instanceof Prisma.PrismaClientUnknownRequestError) {
      assert.ok(String(fkTxnError).includes(FK_TXN));
    } else {
      throw new Error(`Expected Prisma client error, got ${String(fkTxnError)}`);
    }

    let amountError: unknown = null;
    try {
      await prisma.accountingPosting.create({
        data: {
          transactionId: baseTxn.id,
          accountId: 'ASSET:CASH',
          accountType: 'ASSET',
          role: 'SOURCE',
          amount: 0,
          currency: 'USD',
        },
      });
    } catch (err) {
      amountError = err;
    }

    if (amountError === null) {
      throw new Error('Expected amount check constraint violation');
    }
    assertPrismaError(amountError);
    if (amountError instanceof Prisma.PrismaClientKnownRequestError) {
      assert.equal(amountError.code, 'P2004', 'expected check constraint violation');
      const constraint = getPrismaMetaString(amountError, 'constraint');
      if (constraint !== undefined) {
        assert.equal(constraint, CHECK_AMOUNT);
      }
    } else if (amountError instanceof Prisma.PrismaClientUnknownRequestError) {
      assert.ok(String(amountError).includes(CHECK_AMOUNT) || String(amountError).includes('23514'));
    } else {
      throw new Error(`Expected Prisma client error, got ${String(amountError)}`);
    }

    let currencyError: unknown = null;
    try {
      await prisma.accountingPosting.create({
        data: {
          transactionId: baseTxn.id,
          accountId: 'ASSET:CASH',
          accountType: 'ASSET',
          role: 'SOURCE',
          amount: -100,
          currency: 'EUR',
        },
      });
    } catch (err) {
      currencyError = err;
    }

    if (currencyError === null) {
      throw new Error('Expected currency check constraint violation');
    }
    assertPrismaError(currencyError);
    if (currencyError instanceof Prisma.PrismaClientKnownRequestError) {
      const constraint = getPrismaMetaString(currencyError, 'constraint');
      if (constraint !== undefined) {
        assert.equal(constraint, CHECK_CURRENCY);
      }
    } else if (currencyError instanceof Prisma.PrismaClientUnknownRequestError) {
      assert.ok(
        String(currencyError).includes(CHECK_CURRENCY) || String(currencyError).includes('23514')
      );
    } else {
      throw new Error(`Expected Prisma client error, got ${String(currencyError)}`);
    }

    let balanceError: unknown = null;
    try {
      await prisma.accountingPosting.create({
        data: {
          transactionId: baseTxn.id,
          accountId: 'ASSET:CASH',
          accountType: 'ASSET',
          role: 'SOURCE',
          amount: -200,
          currency: 'USD',
        },
      });
    } catch (err) {
      balanceError = err;
    }

    if (balanceError === null) {
      throw new Error('Expected balance check constraint violation');
    }
    assertPrismaError(balanceError);
    if (balanceError instanceof Prisma.PrismaClientKnownRequestError) {
      const constraint = getPrismaMetaString(balanceError, 'constraint');
      if (constraint !== undefined) {
        assert.equal(constraint, CHECK_BALANCE);
      }
    } else if (balanceError instanceof Prisma.PrismaClientUnknownRequestError) {
      assert.ok(
        String(balanceError).includes(CHECK_BALANCE) || String(balanceError).includes('23514')
      );
    } else {
      throw new Error(`Expected Prisma client error, got ${String(balanceError)}`);
    }

    console.warn('db-constraints-accounting-ledger: ok');
  } finally {
    await cleanup(userId);
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
