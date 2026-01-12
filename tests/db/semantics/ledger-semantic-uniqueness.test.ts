import { PrismaClient } from '@prisma/client';
import { assertUniqueViolation } from '../_helpers/assert-db-violation';

const prisma = new PrismaClient();

const EMAIL = 'db-semantics-ledger-unique@cherry.local';
const ORDER_TOKEN = 'semantics-ledger-unique-order';
const EXPIRES_AT = new Date('2026-01-08T00:00:00.000Z');
const UNIQUE_CONSTRAINT = ['cherry_point_ledger__session_id__unique'] as const;

async function run(): Promise<void> {
  let userId: string | null = null;
  let sessionId: string | null = null;

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
          amountCents: 1100,
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

      await tx.cherryPointLedger.create({
        data: {
          userId: ensuredUserId,
          sessionId: session.id,
          points: 5,
          reason: 'semantics-ledger-unique',
          status: 'PENDING',
        },
      });
    });

    let error: unknown = null;
    try {
      if (sessionId === null) {
        throw new Error('Expected session id to be set');
      }
      const duplicateId = `dup-ledger-${sessionId}`;
      const timestamp = new Date('2026-01-08T02:00:00.000Z');
      await prisma.$executeRawUnsafe(
        'INSERT INTO "CherryPointLedger" ("id","userId","sessionId","points","reason","status","awardedAt","createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,($6)::"CherryPointLedgerStatus",$7,$8,$9)',
        duplicateId,
        ensuredUserId,
        sessionId,
        3,
        'semantics-ledger-unique-dup',
        'PENDING',
        timestamp,
        timestamp,
        timestamp
      );
    } catch (err) {
      error = err;
    }

    if (error === null) {
      throw new Error('Expected semantic uniqueness violation for ledger sessionId');
    }
    assertUniqueViolation(error, UNIQUE_CONSTRAINT);

    console.warn('db-semantics-ledger-unique: ok');
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
