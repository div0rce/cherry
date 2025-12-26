/* eslint-disable @typescript-eslint/no-require-imports */
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const assert = require('node:assert/strict');

function mockModule(modulePath, exports) {
  require.cache[require.resolve(modulePath)] = {
    id: modulePath,
    filename: modulePath,
    loaded: true,
    exports,
  };
}

async function testMatchVerifies() {
  const session = {
    id: 'sess-1',
    userId: 'user-1',
    status: 'RECOMMENDED',
    createdAt: new Date('2024-01-01T00:00:00Z'),
    confirmedAmountCents: null,
    amountCents: 2000,
    recommendedBucketId: null,
    bucketSpendReversed: false,
    anomalyCode: 'NONE',
    merchantName: 'Chipotle',
  };

  const updates = { session: [], ledger: [], bucket: [] };

  mockModule('../lib/prisma', {
    prisma: {
      recommendationSession: {
        findFirst: async () => session,
      },
      $transaction: async (cb) =>
        cb({
          recommendationSession: {
            updateMany: async (args) => {
              updates.session.push(args);
              return { count: 1 };
            },
          },
          cherryPointLedger: {
            updateMany: async (args) => {
              updates.ledger.push(args);
              return { count: 1 };
            },
          },
          bucket: {
            updateMany: async (args) => {
              updates.bucket.push(args);
              return { count: 1 };
            },
          },
        }),
    },
  });

  mockModule('../lib/buckets/ensure-fresh', {
    ensureBucketFresh: async () => null,
  });

  mockModule('../lib/sessions/reversal', {
    computeBucketReversal: () => null,
  });

  mockModule('../lib/logger', {
    logError: () => {},
    logWarn: () => {},
  });

  delete require.cache[require.resolve('../lib/verification/verify-session')];
  const { verifySessionFromSignal } = require('../lib/verification/verify-session');

  const result = await verifySessionFromSignal({
    sessionId: 'sess-1',
    userId: 'user-1',
    source: 'BANK',
    amountCents: 2000,
    occurredAt: new Date('2024-01-01T01:00:00Z'),
    merchantFingerprint: 'Chipotle',
  });

  assert.equal(result.ok, true);
  assert.equal(result.sessionStatus, 'VERIFIED');
  assert.equal(result.ledgerStatus, 'POSTED');
  assert.equal(updates.session.length, 1);
  assert.equal(updates.ledger.length, 1);
}

async function testRejectsAndReverses() {
  const session = {
    id: 'sess-2',
    userId: 'user-1',
    status: 'CLAIMED',
    createdAt: new Date('2024-01-01T00:00:00Z'),
    confirmedAmountCents: 2000,
    amountCents: 2000,
    recommendedBucketId: 'bucket-1',
    bucketSpendReversed: false,
    anomalyCode: 'NONE',
    merchantName: 'Store',
  };

  const updates = { session: [], ledger: [], bucket: [] };

  mockModule('../lib/prisma', {
    prisma: {
      recommendationSession: {
        findFirst: async () => session,
      },
      $transaction: async (cb) =>
        cb({
          recommendationSession: {
            updateMany: async (args) => {
              updates.session.push(args);
              return { count: 1 };
            },
          },
          cherryPointLedger: {
            updateMany: async (args) => {
              updates.ledger.push(args);
              return { count: 1 };
            },
          },
          bucket: {
            updateMany: async (args) => {
              updates.bucket.push(args);
              return { count: 1 };
            },
          },
        }),
    },
  });

  mockModule('../lib/buckets/ensure-fresh', {
    ensureBucketFresh: async () => ({ id: 'bucket-1', userId: 'user-1', spentCents: 2000 }),
  });

  mockModule('../lib/sessions/reversal', {
    computeBucketReversal: () => ({ bucketId: 'bucket-1', newSpentCents: 0 }),
  });

  mockModule('../lib/logger', {
    logError: () => {},
    logWarn: () => {},
  });

  delete require.cache[require.resolve('../lib/verification/verify-session')];
  const { verifySessionFromSignal } = require('../lib/verification/verify-session');

  const result = await verifySessionFromSignal({
    sessionId: 'sess-2',
    userId: 'user-1',
    source: 'BANK',
    verified: false,
  });

  assert.equal(result.ok, true);
  assert.equal(result.sessionStatus, 'REJECTED');
  assert.equal(result.ledgerStatus, 'REVOKED');
  assert.equal(updates.bucket.length, 1);
}

async function run() {
  await testMatchVerifies();
  await testRejectsAndReverses();
  console.warn('verification-session: ok');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
