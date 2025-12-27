import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const assert = require('node:assert/strict');
const { prisma, setPrismaClient } = require('../lib/prisma');
const { upsertBankTransactions } = require('../lib/bank/ingest');

function buildMockPrisma() {
  const users = new Map();
  const bankTxs = new Map();

  const client = {
    user: {
      upsert: async ({ where, create, update }) => {
        const existing = users.get(where.id);
        if (existing) {
          const next = { ...existing, ...update };
          users.set(where.id, next);
          return next;
        }
        const created = { id: where.id, ...create };
        users.set(where.id, created);
        return created;
      },
      deleteMany: async ({ where }) => {
        let count = 0;
        for (const key of Array.from(users.keys())) {
          if (where.id === undefined || key === where.id) {
            users.delete(key);
            count += 1;
          }
        }
        return { count };
      },
    },
    bankTransaction: {
      deleteMany: async ({ where }) => {
        let count = 0;
        for (const [key, value] of Array.from(bankTxs.entries())) {
          if (
            (where.userId === undefined || value.userId === where.userId) &&
            (where.externalId === undefined || value.externalId === where.externalId)
          ) {
            bankTxs.delete(key);
            count += 1;
          }
        }
        return { count };
      },
      findUnique: async ({ where }) => {
        const composite = where.userId_externalId;
        if (composite) {
          const key = `${composite.userId}:${composite.externalId}`;
          return bankTxs.get(key) ?? null;
        }
        return null;
      },
      update: async ({ where, data }) => {
        const composite = where.userId_externalId;
        const key = `${composite.userId}:${composite.externalId}`;
        const existing = bankTxs.get(key);
        if (!existing) throw new Error('Record not found');
        const next = { ...existing, ...data };
        bankTxs.set(key, next);
        return next;
      },
      create: async ({ data }) => {
        const key = `${data.userId}:${data.externalId}`;
        const record = { ...data, id: `tx-${bankTxs.size + 1}` };
        bankTxs.set(key, record);
        return record;
      },
    },
    $disconnect: async () => {},
  };

  setPrismaClient(client);
  return client;
}

async function testIdempotentOnCompositeKey() {
  const userId = 'test-user-bank-ingest';
  const externalId = 'csv-dev-test-123';
  buildMockPrisma();

  await prisma.user.upsert({
    where: { id: userId },
    update: {},
    create: { id: userId, email: `${userId}@example.com` },
  });
  await prisma.bankTransaction.deleteMany({ where: { userId, externalId } });

  const baseTx = {
    userId,
    externalId,
    postedAt: new Date('2024-01-01T00:00:00Z'),
    amountMinor: -12345,
    direction: 'debit',
    description: 'Test transaction',
    rawDescription: 'Test transaction raw',
    accountLast4: '2061',
    source: 'csv_dev',
    sourceStatement: 'test.pdf',
    statementStart: null,
    statementEnd: null,
    section: null,
  };

  await upsertBankTransactions([baseTx]);
  const first = await prisma.bankTransaction.findUnique({
    where: { userId_externalId: { userId, externalId } },
  });
  assert.ok(first);
  const firstId = first.id;

  await upsertBankTransactions([baseTx]);
  const second = await prisma.bankTransaction.findUnique({
    where: { userId_externalId: { userId, externalId } },
  });
  assert.ok(second);
  assert.equal(second.id, firstId);
}

async function run() {
  await testIdempotentOnCompositeKey();
  console.warn('bank ingest idempotent: ok');
}

run()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.bankTransaction.deleteMany({
      where: { userId: 'test-user-bank-ingest', externalId: 'csv-dev-test-123' },
    });
    await prisma.user.deleteMany({ where: { id: 'test-user-bank-ingest' } });
    await prisma.$disconnect();
  });
