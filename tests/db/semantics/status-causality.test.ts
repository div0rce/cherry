/**
 * PROVES:
 * - A8: Monotonic ordering / time correctness
 *
 * PRE-EXISTING TEST (RETROFITTED)
 *
 * ASSUMPTIONS:
 * - Status causality rules encode required timestamp ordering.
 *
 * STATE SPACE:
 * - Varies: invalid status writes
 * - Fixed: status/timestamp constraints
 */
import { PrismaClient } from '@prisma/client';
import { assertCheckViolation } from '../_helpers/assert-db-violation';

const prisma = new PrismaClient();

const EMAIL = 'db-semantics-status-causality@cherry.local';
const ORDER_TOKEN = 'semantics-status-causality';
const EXPIRES_AT = new Date('2026-01-07T00:00:00.000Z');

const LEDGER_CHECK = ['cherry_point_ledger__status_posted_at_revoked_at__check'] as const;
const SESSION_CHECK = ['recommendation_session__status_verified_at_rejected_at__check'] as const;

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
          reason: 'semantics-status-ledger',
          status: 'POSTED',
        },
      });
    } catch (err) {
      error = err;
    }

    if (error === null) {
      throw new Error('Expected ledger status causality violation');
    }
    assertCheckViolation(error, LEDGER_CHECK);

    error = null;
    try {
      await prisma.recommendationSession.create({
        data: {
          userId,
          category: 'DINING',
          amountCents: 900,
          orderToken: ORDER_TOKEN,
          source: 'APP_SCAN',
          verdict: 'HEALTHY',
          status: 'VERIFIED',
          expiresAt: EXPIRES_AT,
          budgetVerdict: 'HEALTHY',
          cardVerdict: 'OPTIMAL',
          overallVerdict: 'GREEN',
          coverageMode: 'BUDGETED',
          verificationStatus: 'VERIFIED',
          anomalyCode: 'NONE',
          anomalyDetails: null,
        },
      });
    } catch (err) {
      error = err;
    }

    if (error === null) {
      throw new Error('Expected session status causality violation');
    }
    assertCheckViolation(error, SESSION_CHECK);

    console.warn('db-semantics-status-causality: ok');
  } finally {
    if (userId !== null) {
      await prisma.cherryPointLedger.deleteMany({ where: { userId } });
      await prisma.recommendationSession.deleteMany({ where: { userId } });
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
