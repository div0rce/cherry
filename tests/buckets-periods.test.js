import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const assert = require('node:assert/strict');
const { computeNextPeriodWindow, applyInMemoryRollover } = require('../lib/buckets/periods');

function makeBucket(overrides = {}) {
  return {
    id: 'bucket-1',
    userId: 'user-1',
    name: 'Test',
    period: 'WEEKLY',
    budgetAmount: 10000,
    currentAmount: 0,
    spentCents: 500,
    strictMode: true,
    category: 'DINING',
    periodStart: new Date('2023-01-02T00:00:00.000Z'), // Monday
    periodEnd: new Date('2023-01-09T00:00:00.000Z'),
    createdAt: new Date('2023-01-01T00:00:00.000Z'),
    updatedAt: new Date('2023-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

// Weekly: within window
{
  const now = new Date('2023-01-05T00:00:00.000Z');
  const bucket = makeBucket();
  const result = computeNextPeriodWindow(bucket.period, bucket.periodStart, bucket.periodEnd, now);
  assert.equal(result.needsRollover, false);
  const rolled = applyInMemoryRollover(bucket, now);
  assert.equal(rolled.spentCents, bucket.spentCents);
}

// Weekly: 8 days later -> advance two weeks, reset spend
{
  const now = new Date('2023-01-17T00:00:00.000Z'); // more than one week later
  const bucket = makeBucket();
  const rolled = applyInMemoryRollover(bucket, now);
  assert.equal(rolled.spentCents, 0);
  assert(rolled.periodEnd > now);
}

// Monthly: advance to cover current month, reset spend
{
  const bucket = makeBucket({
    period: 'MONTHLY',
    periodStart: new Date('2023-01-01T00:00:00.000Z'),
    periodEnd: new Date('2023-02-01T00:00:00.000Z'),
  });

  const now = new Date('2023-04-15T00:00:00.000Z');
  const rolled = applyInMemoryRollover(bucket, now);
  assert.equal(rolled.spentCents, 0);
  assert(rolled.periodStart.getMonth() === 3); // April (0-indexed)
  assert(rolled.periodEnd > now);
}

console.log('buckets-periods: ok');
