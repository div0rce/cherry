/**
 * PROVES:
 * - A2: No fund creation or destruction
 *
 * PRE-EXISTING TEST (RETROFITTED)
 *
 * ASSUMPTIONS:
 * - CherryPoint ledger nonnegative constraint is a domain rule outside the axiom set.
 *
 * STATE SPACE:
 * - Varies: missing/invalid points values
 * - Fixed: ledger NOT NULL and check constraints
 */
import * as assert from 'node:assert/strict';
import { Prisma, PrismaClient } from '@prisma/client';
import { assertPrismaError, getPrismaMetaString } from '../_helpers/assert-prisma-error.js';

const prisma = new PrismaClient();

async function run(): Promise<void> {
  const email = 'db-constraints-ledger@cherry.local';
  let userId: string | null = null;

  try {
    await prisma.user.deleteMany({ where: { email } });
    const user = await prisma.user.create({ data: { email } });
    userId = user.id;

    let nullError: unknown = null;
    try {
      await prisma.$executeRawUnsafe(
        'INSERT INTO "CherryPointLedger" ("userId", "points", "reason") VALUES ($1, $2, $3)',
        userId,
        null,
        'missing-points'
      );
    } catch (err) {
      nullError = err;
    }

    if (nullError === null) {
      throw new Error('Expected null constraint violation on CherryPointLedger.points');
    }
    assertPrismaError(nullError);

    if (nullError instanceof Prisma.PrismaClientKnownRequestError) {
      assert.equal(nullError.code, 'P2010', 'expected raw query failure');
      const code = getPrismaMetaString(nullError, 'code');
      if (code !== undefined) {
        assert.equal(code, '23502', 'expected NOT NULL constraint violation');
      } else {
        assert.ok(
          String(nullError).includes('23502') || String(nullError).includes('null value'),
          'expected NOT NULL constraint violation'
        );
      }
    } else if (nullError instanceof Prisma.PrismaClientUnknownRequestError) {
      assert.ok(
        String(nullError).includes('23502') || String(nullError).includes('null value'),
        'expected NOT NULL constraint violation'
      );
    } else {
      throw new Error(`Expected Prisma client error, got ${String(nullError)}`);
    }

    let negativeError: unknown = null;
    try {
      await prisma.cherryPointLedger.create({
        data: {
          userId,
          points: -1,
          reason: 'negative-points',
        },
      });
    } catch (err) {
      negativeError = err;
    }

    if (negativeError === null) {
      throw new Error('Expected check constraint violation on CherryPointLedger.points');
    }
    assertPrismaError(negativeError);

    if (negativeError instanceof Prisma.PrismaClientKnownRequestError) {
      assert.equal(negativeError.code, 'P2004', 'expected check constraint violation');
      const constraint = getPrismaMetaString(negativeError, 'constraint');
      if (constraint !== undefined) {
        assert.equal(
          constraint,
          'points_nonnegative',
          'expected points_nonnegative constraint'
        );
      }
    } else if (negativeError instanceof Prisma.PrismaClientUnknownRequestError) {
      assert.ok(
        String(negativeError).includes('points_nonnegative') || String(negativeError).includes('23514'),
        'expected points_nonnegative constraint violation'
      );
    } else {
      throw new Error(`Expected Prisma client error, got ${String(negativeError)}`);
    }

    console.warn('db-constraints-ledger-required: ok');
  } finally {
    if (userId !== null) {
      await prisma.cherryPointLedger.deleteMany({ where: { userId } });
    }
    await prisma.user.deleteMany({ where: { email } });
    await prisma.$disconnect();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
