/* eslint-disable @typescript-eslint/no-require-imports */
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const assert = require('node:assert/strict');
const { Prisma, PrismaClient } = require('@prisma/client');
const { evaluateTransactionOffline } = require('../lib/evaluator/offline-history');

const prisma = new PrismaClient();

async function seedBankTx(userId, externalId, amountMinor) {
  await prisma.user.upsert({
    where: { id: userId },
    update: {},
    create: { id: userId, email: `${userId}@example.com` },
  });

  return prisma.bankTransaction.create({
    data: {
      userId,
      externalId,
      source: 'csv_dev',
      accountId: 'test-acct',
      amount: new Prisma.Decimal(Math.abs(amountMinor) / 100),
      amountMinor,
      currency: 'USD',
      direction: amountMinor < 0 ? 'DEBIT' : 'CREDIT',
      description: 'Test offline evaluator',
      postedAt: new Date('2024-01-01T00:00:00Z'),
    },
  });
}

async function testOfflineEvaluatorWritesRows() {
  const userId = 'test-offline-eval-user';
  await prisma.historicalEngineEvaluation.deleteMany({ where: { userId } });
  await prisma.bankTransaction.deleteMany({ where: { userId } });

  const tx = await seedBankTx(userId, 'offline-eval-tx-1', -5000);

  const result = await evaluateTransactionOffline({ userId, tx });
  await prisma.historicalEngineEvaluation.create({
    data: {
      userId,
      bankTransactionId: tx.id,
      runId: 'test-run',
      decisionType: result.decisionType,
      cardId: result.cardId,
      bucketId: result.bucketId,
      rawDecision: result.rawDecision,
      scores: result.scores,
    },
  });

  const count = await prisma.historicalEngineEvaluation.count({ where: { userId } });
  assert.ok(count > 0, 'expected evaluator to write rows');
}

async function run() {
  await testOfflineEvaluatorWritesRows();
  console.warn('offline evaluator basic: ok');
}

run()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.historicalEngineEvaluation.deleteMany({ where: { runId: 'test-run' } });
    await prisma.bankTransaction.deleteMany({ where: { userId: 'test-offline-eval-user' } });
    await prisma.user.deleteMany({ where: { id: 'test-offline-eval-user' } });
    await prisma.$disconnect();
  });
