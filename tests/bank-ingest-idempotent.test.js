/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const { prisma } = require('../lib/prisma');
const { upsertBankTransactions } = require('../lib/bank/ingest');

async function testIdempotentOnCompositeKey() {
  const userId = 'test-user-bank-ingest';
  const externalId = 'csv-dev-test-123';

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
