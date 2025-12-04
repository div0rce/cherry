/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const { RegimeBucketTracker } = require('../lib/evaluator/regime-buckets');
const { REGIME_BUCKET_KEYS } = require('../lib/buckets/regimes');

function historicalRegime(id, startMonth, endMonth) {
  return {
    id,
    userId: 'user-offline',
    startMonth,
    endMonth,
    avgNetIncomeCents: 100_000,
    avgFixedCostsCents: 30_000,
    avgFreeCashCents: 70_000,
    regimeLabel: id,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function template(id, regimeId, bucketKey, monthlyLimitCents) {
  return {
    id,
    userId: 'user-offline',
    regimeId,
    bucketKey,
    monthlyLimitCents,
    avgSpendCents: 0,
    targetShareBps: 1000,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function tx(monthIndex, amountMinor) {
  const date = new Date(Date.UTC(2024, monthIndex, 15));
  return {
    id: `tx-${monthIndex}`,
    userId: 'user-offline',
    amountMinor,
    direction: 'DEBIT',
    description: 'GROCERY',
    rawDescription: 'GROCERY',
    merchantName: 'GROCERY',
    merchantCity: null,
    merchantRegion: null,
    merchantCountry: null,
    mcc: 5411,
    postedAt: date,
    occurredAt: date,
    source: 'csv_dev',
    section: null,
    incomeKind: 'NONE',
    p2pKind: 'NONE',
  };
}

async function run() {
  const regimes = [
    historicalRegime('r1', new Date(Date.UTC(2024, 0, 1)), new Date(Date.UTC(2024, 1, 1))),
    historicalRegime('r2', new Date(Date.UTC(2024, 2, 1)), new Date(Date.UTC(2024, 3, 1))),
  ];
  const templates = [
    template('t1', 'r1', REGIME_BUCKET_KEYS.ESSENTIALS_GROCERIES, 20_000),
    template('t2', 'r2', REGIME_BUCKET_KEYS.ESSENTIALS_GROCERIES, 10_000),
  ];

  const tracker = new RegimeBucketTracker(regimes, templates);
  const jan = tracker.apply(tx(0, -5_000));
  assert.equal(jan.regimeId, 'r1');
  assert.equal(jan.bucketKey, REGIME_BUCKET_KEYS.ESSENTIALS_GROCERIES);
  assert.equal(jan.usageBeforeBps, 0);
  assert.ok(jan.usageAfterBps && jan.usageAfterBps > 0);

  const mar = tracker.apply(tx(2, -6_000));
  assert.equal(mar.regimeId, 'r2');
  assert.equal(mar.bucketKey, REGIME_BUCKET_KEYS.ESSENTIALS_GROCERIES);
  assert.ok(mar.usageAfterBps && mar.usageAfterBps > jan.usageAfterBps);

  // refunds should reduce spend
  const refund = tracker.apply({ ...tx(2, 6_000), direction: 'CREDIT', incomeKind: 'REFUND' });
  assert.equal(refund.usageAfterBps, mar.usageAfterBps - Math.round((6000 / 10000) * 10000));

  console.warn('offline-evaluator-regimes: ok');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
