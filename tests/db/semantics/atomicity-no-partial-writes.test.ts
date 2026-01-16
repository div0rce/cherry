/**
 * PROVES:
 * - A7: Atomicity (no partial application)
 *
 * PRE-EXISTING TEST (RETROFITTED)
 *
 * ASSUMPTIONS:
 * - DB transactions are atomic when enforced via Prisma $transaction.
 *
 * STATE SPACE:
 * - Varies: failed transaction contents
 * - Fixed: schema constraints for sessions and ledger rows
 */
import * as assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';
import { assertForeignKeyViolation } from '../_helpers/assert-db-violation';

const prisma = new PrismaClient();

const EMAIL = 'db-semantics-atomicity@cherry.local';
const ORDER_TOKEN = 'semantics-order-token-atomic';
const EXPIRES_AT = new Date('2026-01-03T00:00:00.000Z');
const LEDGER_REASON = 'semantics-atomicity';

async function run(): Promise<void> {
  let userId: string | null = null;

  try {
    await prisma.user.deleteMany({ where: { email: EMAIL } });
    const user = await prisma.user.create({ data: { email: EMAIL } });
    const createdUserId = user.id;
    userId = createdUserId;

    let error: unknown = null;
    try {
      await prisma.$transaction(async (tx) => {
        const session = await tx.recommendationSession.create({
          data: {
            userId: createdUserId,
            category: 'DINING',
            amountCents: 900,
            orderToken: ORDER_TOKEN,
            source: 'APP_SCAN',
            verdict: 'HEALTHY',
            status: 'RECOMMENDED',
            expiresAt: EXPIRES_AT,
            budgetVerdict: 'HEALTHY',
            cardVerdict: 'OPTIMAL',
            overallVerdict: 'GREEN',
            coverageMode: 'BUDGETED',
          },
        });

        await tx.cherryPointLedger.create({
          data: {
            userId: 'missing-user',
            sessionId: session.id,
            points: 5,
            reason: LEDGER_REASON,
          },
        });
      });
    } catch (err) {
      error = err;
    }

    if (error === null) {
      throw new Error('Expected transaction to fail and roll back');
    }

    assertForeignKeyViolation(error, ['CherryPointLedger_userId_fkey']);

    const sessionCount = await prisma.recommendationSession.count({
      where: { userId: createdUserId, orderToken: ORDER_TOKEN },
    });
    assert.equal(sessionCount, 0, 'expected no session after failed transaction');

    const ledgerCount = await prisma.cherryPointLedger.count({
      where: { reason: LEDGER_REASON },
    });
    assert.equal(ledgerCount, 0, 'expected no ledger rows after failed transaction');

    console.warn('db-semantics-atomicity: ok');
  } finally {
    if (userId !== null) {
      await prisma.cherryPointLedger.deleteMany({ where: { reason: LEDGER_REASON } });
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
