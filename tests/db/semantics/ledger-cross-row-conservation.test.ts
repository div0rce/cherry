/**
 * PROVES:
 * - A7: Atomicity (no partial application)
 *
 * PRE-EXISTING TEST (RETROFITTED)
 *
 * ASSUMPTIONS:
 * - Cross-row status constraints enforce atomic lifecycle transitions.
 *
 * STATE SPACE:
 * - Varies: status updates across ledger and session rows
 * - Fixed: cross-row check constraints
 */
import { PrismaClient } from '@prisma/client';
import { assertCheckViolation } from '../_helpers/assert-db-violation';

const prisma = new PrismaClient();

const EMAIL = 'db-semantics-ledger-cross-row@cherry.local';
const ORDER_TOKEN = 'semantics-cross-row-order';
const EXPIRES_AT = new Date('2026-01-06T00:00:00.000Z');
const CHECK_CONSTRAINTS = [
  'cherry_point_ledger__session_status__check',
  'recommendation_session__ledger_status__check',
] as const;

async function run(): Promise<void> {
  let userId: string | null = null;
  let sessionId: string | null = null;
  let ledgerId: string | null = null;

  try {
    await prisma.user.deleteMany({ where: { email: EMAIL } });
    const user = await prisma.user.create({ data: { email: EMAIL } });
    const ensuredUserId = user.id;
    userId = ensuredUserId;

    await prisma.$transaction(async (tx) => {
      const session = await tx.recommendationSession.create({
        data: {
          userId: ensuredUserId,
          category: 'DINING',
          amountCents: 1200,
          orderToken: ORDER_TOKEN,
          source: 'APP_SCAN',
          verdict: 'HEALTHY',
          status: 'CLAIMED',
          expiresAt: EXPIRES_AT,
          budgetVerdict: 'HEALTHY',
          cardVerdict: 'OPTIMAL',
          overallVerdict: 'GREEN',
          coverageMode: 'BUDGETED',
          verificationStatus: 'PENDING',
          anomalyCode: 'NONE',
          anomalyDetails: null,
        },
      });
      sessionId = session.id;

      const ledger = await tx.cherryPointLedger.create({
        data: {
          userId: ensuredUserId,
          sessionId: session.id,
          points: 5,
          reason: 'semantics-cross-row',
          status: 'PENDING',
        },
      });
      ledgerId = ledger.id;
    });

    let error: unknown = null;
    try {
      if (ledgerId === null) {
        throw new Error('Expected ledger id to be set');
      }
      await prisma.cherryPointLedger.update({
        where: { id: ledgerId },
        data: { status: 'POSTED', postedAt: new Date('2026-01-06T01:00:00.000Z') },
      });
    } catch (err) {
      error = err;
    }

    if (error === null) {
      throw new Error('Expected ledger/session cross-row violation on POSTED update');
    }
    assertCheckViolation(error, [CHECK_CONSTRAINTS[0]]);

    error = null;
    try {
      if (sessionId === null) {
        throw new Error('Expected session id to be set');
      }
      await prisma.recommendationSession.update({
        where: { id: sessionId },
        data: { status: 'VERIFIED', verifiedAt: new Date('2026-01-06T01:00:00.000Z') },
      });
    } catch (err) {
      error = err;
    }

    if (error === null) {
      throw new Error('Expected session/ledger cross-row violation on VERIFIED update');
    }
    assertCheckViolation(error, [CHECK_CONSTRAINTS[1]]);

    console.warn('db-semantics-ledger-cross-row: ok');
  } finally {
    if (ledgerId !== null) {
      await prisma.cherryPointLedger.deleteMany({ where: { id: ledgerId } });
    }
    if (sessionId !== null) {
      await prisma.recommendationSession.deleteMany({ where: { id: sessionId } });
    }
    if (userId !== null) {
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
