import assert from 'node:assert/strict';
import { prisma } from '../lib/prisma';

async function run(): Promise<void> {
  await prisma.idempotencyKey.create({
    data: {
      key: 'idempotency-key-1',
      userId: 'user-1',
      payload: { ok: true },
    },
  });

  let threw = false;
  try {
    await prisma.idempotencyKey.create({
      data: {
        key: 'idempotency-key-1',
        userId: 'user-1',
        payload: { ok: false },
      },
    });
  } catch (err) {
    threw = true;
    const code = (err as { code?: string }).code ?? null;
    assert.equal(code, 'P2002');
  }

  assert.ok(threw, 'expected duplicate idempotency key create to throw');

  const otherUser = await prisma.idempotencyKey.create({
    data: {
      key: 'idempotency-key-1',
      userId: 'user-2',
      payload: { ok: true },
    },
  });
  assert.equal(otherUser.userId, 'user-2');
  console.warn('idempotency-key: ok');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
