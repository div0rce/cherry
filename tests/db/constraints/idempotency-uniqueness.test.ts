/**
 * PROVES:
 * - A6: Idempotency under duplicate inputs
 *
 * PRE-EXISTING TEST (RETROFITTED)
 *
 * ASSUMPTIONS:
 * - IdempotencyKey uniqueness is the dedup guarantee.
 *
 * STATE SPACE:
 * - Varies: duplicate and concurrent inserts
 * - Fixed: IdempotencyKey uniqueness constraint
 */
import * as assert from 'node:assert/strict';
import { Prisma, PrismaClient } from '@prisma/client';
import { assertPrismaError } from '../_helpers/assert-prisma-error';

const prisma = new PrismaClient();

type IdempotencyKeyRecord = Awaited<ReturnType<PrismaClient['idempotencyKey']['create']>>;

async function run(): Promise<void> {
  const email = 'db-constraints-idempotency@cherry.local';
  const key = 'idem-key-1';
  const concurrentKey = 'idem-key-concurrent';
  let userId: string | null = null;

  try {
    await prisma.user.deleteMany({ where: { email } });
    const user = await prisma.user.create({ data: { email } });
    userId = user.id;

    await prisma.idempotencyKey.deleteMany({ where: { userId } });

    await prisma.idempotencyKey.create({
      data: {
        userId,
        key,
        payload: { run: 1 },
      },
    });

    let error: unknown = null;
    try {
      await prisma.idempotencyKey.create({
        data: {
          userId,
          key,
          payload: { run: 2 },
        },
      });
    } catch (err) {
      error = err;
    }

    if (error === null) {
      throw new Error('Expected unique constraint violation on IdempotencyKey');
    }
    assertPrismaError(error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      assert.equal(error.code, 'P2002', 'expected unique constraint violation');
    } else {
      throw new Error(`Expected PrismaClientKnownRequestError, got ${String(error)}`);
    }

    const count = await prisma.idempotencyKey.count({ where: { userId, key } });
    assert.equal(count, 1, 'expected single idempotency row');

    await prisma.idempotencyKey.deleteMany({ where: { userId, key: concurrentKey } });
    const operations: Array<Promise<IdempotencyKeyRecord>> = [
      prisma.idempotencyKey.create({
        data: {
          userId,
          key: concurrentKey,
          payload: { run: 1 },
        },
      }),
      prisma.idempotencyKey.create({
        data: {
          userId,
          key: concurrentKey,
          payload: { run: 2 },
        },
      }),
    ];

    const results = await Promise.allSettled(operations);

    const successCount = results.filter((result) => result.status === 'fulfilled').length;
    const failure = results.find((result) => result.status === 'rejected');
    assert.equal(successCount, 1, 'expected exactly one concurrent insert to succeed');
    assert.ok(failure, 'expected one concurrent insert to fail');

    if (failure?.status === 'rejected') {
      const failureError: unknown = failure.reason;
      assertPrismaError(failureError);
      if (failureError instanceof Prisma.PrismaClientKnownRequestError) {
        assert.equal(failureError.code, 'P2002', 'expected unique constraint violation');
      } else {
        throw new Error(`Expected PrismaClientKnownRequestError, got ${String(failureError)}`);
      }
    }

    const concurrentCount = await prisma.idempotencyKey.count({
      where: { userId, key: concurrentKey },
    });
    assert.equal(concurrentCount, 1, 'expected single row after concurrent inserts');

    console.warn('db-constraints-idempotency: ok');
  } finally {
    if (userId !== null) {
      await prisma.idempotencyKey.deleteMany({ where: { userId } });
    }
    await prisma.user.deleteMany({ where: { email } });
    await prisma.$disconnect();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
