import * as assert from 'node:assert/strict';
import { Prisma, PrismaClient } from '@prisma/client';
import { assertPrismaError } from './_helpers/assert-prisma-error';

const prisma = new PrismaClient();

async function run(): Promise<void> {
  const email = 'db-smoke-user@cherry.local';
  try {
    await prisma.user.deleteMany({ where: { email } });

    let error: unknown = null;
    try {
      await prisma.$transaction(async (tx) => {
        await tx.user.create({ data: { email } });
        await tx.user.create({ data: { email } });
      });
    } catch (err) {
      error = err;
    }

    if (error === null) {
      throw new Error('Expected unique constraint violation on User.email');
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      assert.equal(error.code, 'P2002', 'expected unique constraint violation');
    } else {
      throw new Error(`Expected PrismaClientKnownRequestError, got ${String(error)}`);
    }

    console.warn('db-smoke: ok');
  } finally {
    await prisma.user.deleteMany({ where: { email } });
    await prisma.$disconnect();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
