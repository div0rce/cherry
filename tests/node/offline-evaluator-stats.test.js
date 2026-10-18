import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const assert = require('node:assert/strict');
const { computeOfflineStats } = require('../../lib/evaluator/stats');

function row(amountMinor, decisionType, extra = {}) {
  return {
    decisionType,
    bucketUsageAfterBps: null,
    rawDecision: null,
    bankTransaction: { direction: amountMinor < 0 ? 'DEBIT' : 'CREDIT', amountMinor, amount: null },
    ...extra,
  };
}

const rows = [
  row(5000, 'USE_CARD'), // credit: ignored
  row(-499, 'USE_CARD'), // below min: skipped
  row(-999, 'USE_CARD', { rawDecision: { components: { rewards: 0.01 } } }),
  row(-4999, 'USE_CARD_WITH_PAYDOWN', { bucketUsageAfterBps: 8000 }),
  row(-5000, 'DELAY_PURCHASE', {
    bucketUsageAfterBps: 10000,
    rawDecision: { components: { rewards: 0.004 } },
  }),
  row(-20000, 'SWITCH_MERCHANT', { bucketUsageAfterBps: 7999, rawDecision: { components: {} } }),
  row(-6000, 'NO_ACTION', { rawDecision: 'x' }),
  {
    decisionType: 'REJECT_PURCHASE',
    bucketUsageAfterBps: 9000,
    rawDecision: null,
    bankTransaction: { direction: 'debit', amountMinor: null, amount: '12.34' },
  },
];

const stats = computeOfflineStats(rows);
assert.deepStrictEqual(stats, {
  totalDebits: 7,
  engineRan: 6,
  nearBucketEdgeCount: 3,
  overBucketCapCount: 1,
  bucketSampleSize: 4,
  wouldHaveSoftIntervenedCount: 3,
  avgRewardRateActual: 0.007,
  avgRewardRateBest: 0.007,
  betterRewardCount: 1,
  rewardSampleSize: 2,
  smallDebitCount: 1,
  mediumDebitCount: 2,
  largeDebitCount: 2,
  veryLargeDebitCount: 1,
  highPainSampleSize: 3,
  highPainCandidateCount: 3,
  highPainWarningCount: 2,
  cardPickCount: 2,
  skipCount: 1,
});

const custom = computeOfflineStats(rows, {
  bucketNearEdgeThreshold: 0.95,
  highPainThreshold: 100_00,
  rewardDeltaBps: 30,
});
assert.equal(custom.nearBucketEdgeCount, 1);
assert.equal(custom.wouldHaveSoftIntervenedCount, 1);
assert.equal(custom.highPainCandidateCount, 1);
assert.equal(custom.highPainWarningCount, 1);
assert.equal(custom.betterRewardCount, 2);

const empty = computeOfflineStats([]);
assert.equal(empty.avgRewardRateActual, null);
assert.equal(empty.avgRewardRateBest, null);
assert.deepStrictEqual(Object.keys(empty), Object.keys(stats));
console.warn('offline evaluator stats: ok');
