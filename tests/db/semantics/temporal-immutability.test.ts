import { PrismaClient } from '@prisma/client';
import { assertCheckViolation } from '../_helpers/assert-db-violation';

const prisma = new PrismaClient();

const EMAIL = 'db-semantics-immutable@cherry.local';
const ORDER_TOKEN = 'semantics-immutable-order';
const ORDER_TOKEN_REVOKED = 'semantics-immutable-order-revoked';
const CREATED_AT = new Date('2026-01-09T00:00:00.000Z');
const EXPIRES_AT = new Date('2026-01-10T00:00:00.000Z');
const POSTED_AT = new Date('2026-01-09T01:00:00.000Z');
const REVOKED_AT = new Date('2026-01-09T01:10:00.000Z');
const VERIFIED_AT = POSTED_AT;
const REJECTED_AT = REVOKED_AT;

const LEDGER_IMMUTABLE = ['cherry_point_ledger__status_final__check'] as const;
const SESSION_IMMUTABLE = ['recommendation_session__status_final__check'] as const;

async function run(): Promise<void> {
  let userId: string | null = null;
  let sessionId: string | null = null;
  let revokedLedgerId: string | null = null;
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
          amountCents: 1300,
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
          verifiedAt: VERIFIED_AT,
          anomalyCode: 'NONE',
          anomalyDetails: null,
          createdAt: CREATED_AT,
          updatedAt: CREATED_AT,
        },
      });
      sessionId = session.id;

      const ledger = await tx.cherryPointLedger.create({
        data: {
          userId: ensuredUserId,
          sessionId: session.id,
          points: 7,
          reason: 'semantics-immutable',
          status: 'POSTED',
          postedAt: POSTED_AT,
          createdAt: CREATED_AT,
          updatedAt: CREATED_AT,
        },
      });
      ledgerId = ledger.id;

      const revokedSession = await tx.recommendationSession.create({
        data: {
          userId: ensuredUserId,
          category: 'DINING',
          amountCents: 1300,
          orderToken: ORDER_TOKEN_REVOKED,
          source: 'APP_SCAN',
          verdict: 'HEALTHY',
          status: 'REJECTED',
          expiresAt: EXPIRES_AT,
          budgetVerdict: 'HEALTHY',
          cardVerdict: 'OPTIMAL',
          overallVerdict: 'GREEN',
          coverageMode: 'BUDGETED',
          verificationStatus: 'FAILED',
          rejectedAt: REJECTED_AT,
          anomalyCode: 'NONE',
          anomalyDetails: null,
          createdAt: CREATED_AT,
          updatedAt: CREATED_AT,
        },
      });

      const revokedLedger = await tx.cherryPointLedger.create({
        data: {
          userId: ensuredUserId,
          sessionId: revokedSession.id,
          points: 7,
          reason: 'semantics-immutable-revoked',
          status: 'REVOKED',
          revokedAt: REVOKED_AT,
          createdAt: CREATED_AT,
          updatedAt: CREATED_AT,
        },
      });
      revokedLedgerId = revokedLedger.id;
    });

    let error: unknown = null;
    try {
      if (ledgerId === null) {
        throw new Error('Expected ledger id to be set');
      }
      await prisma.cherryPointLedger.update({
        where: { id: ledgerId },
        data: { points: 9 },
      });
    } catch (err) {
      error = err;
    }

    if (error === null) {
      throw new Error('Expected ledger immutability violation');
    }
    assertCheckViolation(error, LEDGER_IMMUTABLE);

    error = null;
    try {
      if (revokedLedgerId === null) {
        throw new Error('Expected revoked ledger id to be set');
      }
      await prisma.cherryPointLedger.update({
        where: { id: revokedLedgerId },
        data: { points: 11 },
      });
    } catch (err) {
      error = err;
    }

    if (error === null) {
      throw new Error('Expected revoked ledger immutability violation');
    }
    assertCheckViolation(error, LEDGER_IMMUTABLE);

    error = null;
    try {
      if (sessionId === null) {
        throw new Error('Expected session id to be set');
      }
      await prisma.recommendationSession.update({
        where: { id: sessionId },
        data: { merchantName: 'Do not mutate' },
      });
    } catch (err) {
      error = err;
    }

    if (error === null) {
      throw new Error('Expected session immutability violation');
    }
    assertCheckViolation(error, SESSION_IMMUTABLE);

    console.warn('db-semantics-temporal-immutability: ok');
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
