import { createRequire } from 'node:module';

// runDailyForUser branches: fresh compute + upsert + alert, keep-existing on a same-inputs
// downgrade, fallback upsert on compute failure, and alert failures swallowed.

const require = createRequire(import.meta.url);
const assert = require('node:assert/strict');

function mockModule(modulePath, exports) {
  require.cache[require.resolve(modulePath)] = { id: modulePath, filename: modulePath, loaded: true, exports };
}

const day = new Date('2026-10-10T00:00:00Z');
const nowMs = Date.UTC(2026, 9, 17, 12);
const bucket = {
  id: 'b1',
  userId: 'user-1',
  category: 'FOOD',
  budgetAmount: 3000,
  spentCents: 1500,
  periodEnd: new Date('2026-10-31T00:00:00Z'),
};

function load({ existing = null, failBuckets = false, failAlert = false }) {
  const calls = { upserts: [], alerts: 0 };
  mockModule('../../lib/prisma', {
    prisma: {
      dailyState: {
        findUnique: async () => existing,
        findFirst: async () => null,
        upsert: async (args) => {
          calls.upserts.push(args);
          return { ...args.create, id: 'ds1' };
        },
      },
      bucket: {
        findMany: async () => {
          if (failBuckets) throw new Error('boom');
          return [bucket];
        },
      },
      card: { findMany: async () => [{ id: 'c1', rewardRules: [] }] },
      cherryPointLedger: { aggregate: async () => ({ _sum: { points: 7 } }) },
      recommendationSession: { count: async () => 2 },
    },
  });
  mockModule('../../lib/buckets/ensure-fresh', { ensureBucketFresh: async () => bucket });
  mockModule('../../lib/alerts/processDailyStateAlert', {
    processDailyStateAlert: async () => {
      calls.alerts += 1;
      if (failAlert) throw new Error('alert down');
    },
  });
  mockModule('../../lib/config/store', { getServerConfig: () => ({ engineVersion: 'v-test' }) });
  mockModule('../../lib/logger', { logError: () => {}, logWarn: () => {}, logInfo: () => {} });
  delete require.cache[require.resolve('../../lib/daily-state/runDailyForUser')];
  return { calls, run: require('../../lib/daily-state/runDailyForUser').runDailyForUser };
}

// Fresh compute: remaining 1500 <= 2000 -> TIGHT, upsert, alert.
{
  const { calls, run } = load({});
  const result = await run({ userId: 'user-1', date: day, source: 'MANUAL', nowMs });
  assert.equal(result.status, 'TIGHT');
  assert.equal(result.engineVersion, 'v-test');
  assert.equal(calls.upserts.length, 1);
  const { create, update } = calls.upserts[0];
  assert.equal(create.safeToSpendCents, 1500);
  assert.equal(update.safeToSpendCents, 1500);
  assert.equal(create.summary.pointsPending, 7);
  assert.equal(create.summary.sessionsPendingVerification, 2);
  assert.equal(create.errors, null);
  assert.equal(typeof result.inputsVersion, 'string');
  assert.equal(calls.alerts, 1);

  // Same inputs, existing status ranks higher: keep existing, no write, no alert.
  const existing = { status: 'SAFE', inputsVersion: result.inputsVersion, engineVersion: 'old' };
  const second = load({ existing });
  const kept = await second.run({ userId: 'user-1', date: day, source: 'MANUAL', nowMs });
  assert.deepEqual(kept, { status: 'SAFE', inputsVersion: result.inputsVersion, engineVersion: 'old' });
  assert.equal(second.calls.upserts.length, 0);
  assert.equal(second.calls.alerts, 0);
}

// Compute failure: fallback INSUFFICIENT_DATA row with the error message, no alert.
{
  const { calls, run } = load({ failBuckets: true });
  const result = await run({ userId: 'user-1', date: day, source: 'MANUAL', nowMs });
  assert.deepEqual(result, { status: 'INSUFFICIENT_DATA', inputsVersion: null, engineVersion: 'v-test' });
  assert.equal(calls.upserts.length, 1);
  assert.equal(calls.upserts[0].update.errors, 'boom');
  assert.equal(calls.upserts[0].create.inputsVersion, null);
  assert.equal(calls.alerts, 0);
}

// Alert failure is swallowed.
{
  const { calls, run } = load({ failAlert: true });
  const result = await run({ userId: 'user-1', date: day, source: 'MANUAL', nowMs });
  assert.equal(result.status, 'TIGHT');
  assert.equal(calls.alerts, 1);
}

process.stdout.write('daily-state-runner: ok\n');
