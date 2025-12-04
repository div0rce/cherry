/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const { prisma } = require('../lib/prisma');
const { assertOfflineEvaluatorModelsReady } = require('../lib/evaluator/prisma-safe');

async function run() {
  const originalIncome = prisma.historicalIncomeRegime;
  const originalBucket = prisma.historicalBucketTemplate;

  try {
    // @ts-expect-error test mutation
    prisma.historicalIncomeRegime = undefined;
    // @ts-expect-error test mutation
    prisma.historicalBucketTemplate = undefined;

    let threw = false;
    try {
      await assertOfflineEvaluatorModelsReady();
    } catch {
      threw = true;
    }
    assert.ok(threw, 'expected guard to throw when offline evaluator models are missing on the client');
  } finally {
    // restore for other tests
    // @ts-expect-error restore
    prisma.historicalIncomeRegime = originalIncome;
    // @ts-expect-error restore
    prisma.historicalBucketTemplate = originalBucket;
  }

  console.warn('offline-evaluator-prisma-guard: ok');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
