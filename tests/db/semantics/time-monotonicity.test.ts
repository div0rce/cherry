import { PrismaClient } from '@prisma/client';
import { assertCheckViolation } from '../_helpers/assert-db-violation';

const prisma = new PrismaClient();

const EMAIL = 'db-semantics-time@cherry.local';
const ORDER_TOKEN = 'semantics-order-token-time';
const EXPIRES_AT = new Date('2026-01-04T00:00:00.000Z');
const CREATED_AT = new Date('2026-01-01T00:00:00.000Z');
const PAST_AT = new Date('2025-12-31T23:00:00.000Z');

const CHECK_CONSTRAINTS = [
  'cherry_point_ledger__posted_at__check',
  'cherry_point_ledger__revoked_at__check',
  'recommendation_session__verified_at__check',
  'recommendation_session__rejected_at__check',
] as const;


async function run(): Promise<void> {
  let userId: string | null = null;

  try {
    await prisma.user.deleteMany({ where: { email: EMAIL } });
    const user = await prisma.user.create({ data: { email: EMAIL } });
    userId = user.id;

    let error: unknown = null;
    try {
      await prisma.cherryPointLedger.create({
        data: {
          userId,
          points: 5,
          reason: CHECK_CONSTRAINTS[0],
          createdAt: CREATED_AT,
          postedAt: PAST_AT,
        },
      });
    } catch (err) {
      error = err;
    }

    if (error === null) {
      throw new Error('Expected postedAt monotonicity failure');
    }
    assertCheckViolation(error, CHECK_CONSTRAINTS);

    error = null;
    try {
      await prisma.cherryPointLedger.create({
        data: {
          userId,
          points: 5,
          reason: CHECK_CONSTRAINTS[1],
          createdAt: CREATED_AT,
          revokedAt: PAST_AT,
        },
      });
    } catch (err) {
      error = err;
    }

    if (error === null) {
      throw new Error('Expected revokedAt monotonicity failure');
    }
    assertCheckViolation(error, CHECK_CONSTRAINTS);

    error = null;
    try {
      await prisma.recommendationSession.create({
        data: {
          userId,
          category: 'DINING',
          amountCents: 1000,
          orderToken: ORDER_TOKEN,
          source: 'APP_SCAN',
          verdict: 'HEALTHY',
          status: 'RECOMMENDED',
          expiresAt: EXPIRES_AT,
          budgetVerdict: 'HEALTHY',
          cardVerdict: 'OPTIMAL',
          overallVerdict: 'GREEN',
          coverageMode: 'BUDGETED',
          createdAt: CREATED_AT,
          verifiedAt: PAST_AT,
        },
      });
    } catch (err) {
      error = err;
    }

    if (error === null) {
      throw new Error('Expected verifiedAt monotonicity failure');
    }
    assertCheckViolation(error, CHECK_CONSTRAINTS);

    error = null;
    try {
      await prisma.recommendationSession.create({
        data: {
          userId,
          category: 'DINING',
          amountCents: 1000,
          orderToken: `${ORDER_TOKEN}-rejected`,
          source: 'APP_SCAN',
          verdict: 'HEALTHY',
          status: 'RECOMMENDED',
          expiresAt: EXPIRES_AT,
          budgetVerdict: 'HEALTHY',
          cardVerdict: 'OPTIMAL',
          overallVerdict: 'GREEN',
          coverageMode: 'BUDGETED',
          createdAt: CREATED_AT,
          rejectedAt: PAST_AT,
        },
      });
    } catch (err) {
      error = err;
    }

    if (error === null) {
      throw new Error('Expected rejectedAt monotonicity failure');
    }
    assertCheckViolation(error, CHECK_CONSTRAINTS);

    console.warn('db-semantics-time-monotonicity: ok');
  } finally {
    if (userId !== null) {
      await prisma.cherryPointLedger.deleteMany({ where: { userId } });
      await prisma.recommendationSession.deleteMany({
        where: { userId, orderToken: { startsWith: ORDER_TOKEN } },
      });
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
