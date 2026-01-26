import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const assert = require('node:assert/strict');

const { computeBucketReversal } = require('../../lib/sessions/reversal');

function simulateConfirm(session, bucket, amountCents) {
  if (amountCents <= 0) throw new Error('Confirm requires positive amount');
  session.confirmedAmountCents = amountCents;
  session.bucketSpendReversed = false;
  bucket.spentCents += amountCents;
}

function simulateVerify(session, bucket, verified) {
  const reversal = computeBucketReversal({
    verified,
    confirmedAmountCents: session.confirmedAmountCents ?? null,
    bucketSpendReversed: session.bucketSpendReversed ?? false,
    bucketId: bucket.id,
    currentBucketSpentCents: bucket.spentCents,
  });

  if (reversal) {
    bucket.spentCents = reversal.newSpentCents;
    session.bucketSpendReversed = true;
  }

  return reversal;
}

async function run() {
  // Case 1: verify(true) keeps spend
  const bucket1 = { id: 'bkt-1', spentCents: 0 };
  const session1 = { confirmedAmountCents: null, bucketSpendReversed: false };
  simulateConfirm(session1, bucket1, 2000);
  assert.equal(bucket1.spentCents, 2000);
  const reversal1 = simulateVerify(session1, bucket1, true);
  assert.equal(reversal1, null);
  assert.equal(bucket1.spentCents, 2000);
  assert.equal(session1.bucketSpendReversed, false);

  // Case 2: verify(false) reverses once
  const bucket2 = { id: 'bkt-2', spentCents: 0 };
  const session2 = { confirmedAmountCents: null, bucketSpendReversed: false };
  simulateConfirm(session2, bucket2, 2000);
  assert.equal(bucket2.spentCents, 2000);
  const reversal2 = simulateVerify(session2, bucket2, false);
  assert.deepEqual(reversal2, { bucketId: 'bkt-2', newSpentCents: 0 });
  assert.equal(bucket2.spentCents, 0);
  assert.equal(session2.bucketSpendReversed, true);

  // Case 3: double rejection does not double-reverse
  const reversal3 = simulateVerify(session2, bucket2, false);
  assert.equal(reversal3, null);
  assert.equal(bucket2.spentCents, 0);

  console.warn('sessions bucket reversal: ok');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

