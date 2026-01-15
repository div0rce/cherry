import * as assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';
import { assertCheckViolation } from '../_helpers/assert-db-violation';

const prisma = new PrismaClient();

const EMAIL = 'db-semantics-ledger@cherry.local';
const REASON = 'semantics-ledger';
const CHECK_CONSTRAINTS = ['points_nonnegative'] as const;

async function run(): Promise<void> {
  let userId: string | null = null;

  try {
    await prisma.user.deleteMany({ where: { email: EMAIL } });
    const user = await prisma.user.create({ data: { email: EMAIL } });
    userId = user.id;

    await prisma.cherryPointLedger.create({
      data: { userId, points: 10, reason: REASON },
    });
    await prisma.cherryPointLedger.create({
      data: { userId, points: 20, reason: REASON },
    });
    await prisma.cherryPointLedger.create({
      data: { userId, points: 5, reason: REASON },
    });

    const aggregate = await prisma.cherryPointLedger.aggregate({
      _sum: { points: true },
      where: { userId, reason: REASON },
    });
    const total = aggregate._sum.points ?? 0;
    assert.equal(total, 35, 'expected points sum to match ledger entries');

    let error: unknown = null;
    try {
      await prisma.cherryPointLedger.create({
        data: { userId, points: -1, reason: `${REASON}-invalid` },
      });
    } catch (err) {
      error = err;
    }

    if (error === null) {
      throw new Error('Expected negative points to be rejected');
    }
    assertCheckViolation(error, CHECK_CONSTRAINTS);

    console.warn('db-semantics-ledger-conservation: ok');
  } finally {
    if (userId !== null) {
      await prisma.cherryPointLedger.deleteMany({ where: { userId } });
      await prisma.user.deleteMany({ where: { id: userId } });
    }
    await prisma.user.deleteMany({ where: { email: EMAIL } });
    await prisma.$disconnect();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
