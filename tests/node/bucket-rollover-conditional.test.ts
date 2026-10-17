import * as assert from 'node:assert/strict';
import { ensureBucketFresh } from '../../lib/buckets/ensure-fresh.js';

// ensureBucketFresh only rolls a bucket whose period is still the one it read. If a concurrent
// caller already rolled it (and a confirm then incremented its spend), the stale rollover must not
// reset spentCents; the current row is returned instead.

const periodStart = new Date(Date.UTC(2026, 8, 1));
const periodEnd = new Date(Date.UTC(2026, 9, 1));
const now = new Date(Date.UTC(2026, 9, 17, 12));
const stale = {
  id: 'bucket-1',
  userId: 'user-1',
  period: 'MONTHLY',
  periodStart,
  periodEnd,
  budgetAmount: 50_000,
  spentCents: 42_000,
  currentAmount: 8_000,
  lastResetAt: null,
};

function fakeDb(afterUpdate: Record<string, unknown>) {
  const writes: Array<{ where: Record<string, unknown>; data: Record<string, unknown> }> = [];
  let reads = 0;
  const db = {
    bucket: {
      findUnique: async () => {
        reads += 1;
        return reads === 1 ? stale : afterUpdate;
      },
      updateMany: async (args: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
        writes.push(args);
        return { count: 1 };
      },
    },
  };
  return { db, writes };
}

// The rollover write is conditional on the period that was read, and the row is re-read after it.
{
  const rolledRow = { ...stale, periodStart: periodEnd, spentCents: 0 };
  const { db, writes } = fakeDb(rolledRow);
  const result = await ensureBucketFresh('bucket-1', now, db as never);
  assert.equal(writes.length, 1);
  assert.deepEqual(writes[0]?.where, { id: 'bucket-1', periodStart, periodEnd });
  assert.equal(writes[0]?.data['spentCents'], 0);
  assert.equal(result, rolledRow);
}

// Another caller rolled first and a purchase was added: the returned row keeps that spend.
{
  const concurrent = { ...stale, periodStart: periodEnd, spentCents: 1_250 };
  const { db } = fakeDb(concurrent);
  db.bucket.updateMany = async () => ({ count: 0 });
  const result = await ensureBucketFresh('bucket-1', now, db as never);
  assert.equal((result as { spentCents: number }).spentCents, 1_250);
}

process.stdout.write('bucket-rollover-conditional: ok\n');
