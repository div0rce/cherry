import * as assert from 'node:assert/strict';
import { Prisma, PrismaClient } from '@prisma/client';
import { assertPrismaError } from '../_helpers/assert-prisma-error.js';

const prisma = new PrismaClient();

async function run(): Promise<void> {
  const email = 'db-constraints-user-unique@cherry.local';
  try {
    await prisma.user.deleteMany({ where: { email } });

    await prisma.user.create({ data: { email } });

    let error: unknown = null;
    try {
      await prisma.user.create({ data: { email } });
    } catch (err) {
      error = err;
    }

    if (error === null) {
      throw new Error('Expected unique constraint violation on User.email');
    }
    assertPrismaError(error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      assert.equal(error.code, 'P2002', 'expected unique constraint violation');
    } else {
      throw new Error(`Expected PrismaClientKnownRequestError, got ${String(error)}`);
    }

    console.warn('db-constraints-user-uniqueness: ok');
  } finally {
    await prisma.user.deleteMany({ where: { email } });
    await prisma.$disconnect();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
