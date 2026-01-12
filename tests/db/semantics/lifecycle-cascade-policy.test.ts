import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const EMAIL = 'db-semantics-lifecycle@cherry.local';
const ORDER_TOKEN = 'semantics-order-token-lifecycle';
const DECISION_ID = 'semantics-decision-lifecycle';
const EXPIRES_AT = new Date('2026-01-05T00:00:00.000Z');

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
        },
      });
      sessionId = session.id;

      await tx.cherryPointLedger.create({
        data: {
          userId: ensuredUserId,
          sessionId: session.id,
          points: 5,
          reason: 'semantics-lifecycle',
          status: 'PENDING',
        },
      });
    });

    if (sessionId === null) {
      throw new Error('Expected session id to be set');
    }
    const ensuredSessionId = sessionId;

    await prisma.autopilotCommit.create({
      data: {
        userId,
        sessionId: ensuredSessionId,
        decisionId: DECISION_ID,
      },
    });

    await prisma.user.delete({ where: { id: userId } });

    const sessionCount = await prisma.recommendationSession.count({
      where: { id: ensuredSessionId },
    });
    assert.equal(sessionCount, 0, 'expected session cascade on user delete');

    const commitCount = await prisma.autopilotCommit.count({
      where: { sessionId: ensuredSessionId },
    });
    assert.equal(commitCount, 0, 'expected autopilot commit cascade on user delete');

    const ledgerCount = await prisma.cherryPointLedger.count({
      where: { sessionId: ensuredSessionId },
    });
    assert.equal(ledgerCount, 0, 'expected ledger cascade on user delete');

    console.warn('db-semantics-lifecycle: ok');
  } finally {
    if (userId !== null) {
      await prisma.cherryPointLedger.deleteMany({ where: { userId } });
      await prisma.autopilotCommit.deleteMany({ where: { userId, decisionId: DECISION_ID } });
      await prisma.recommendationSession.deleteMany({ where: { userId, orderToken: ORDER_TOKEN } });
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
