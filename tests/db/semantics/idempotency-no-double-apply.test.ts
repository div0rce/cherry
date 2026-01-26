/**
 * PROVES:
 * - A6: Idempotency under duplicate inputs
 *
 * PRE-EXISTING TEST (RETROFITTED)
 *
 * ASSUMPTIONS:
 * - Idempotency keys are the canonical dedup mechanism for commits.
 *
 * STATE SPACE:
 * - Varies: duplicate commit attempts
 * - Fixed: idempotency key schema constraints
 */
import * as assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';
import { assertUniqueViolation } from '../_helpers/assert-db-violation.js';

const prisma = new PrismaClient();

const EMAIL = 'db-semantics-idempotency@cherry.local';
const IDEM_KEY = 'semantics-idem-key';
const DECISION_ID = 'semantics-decision-1';
const ORDER_TOKEN = 'semantics-order-token-1';
const EXPIRES_AT = new Date('2026-01-02T00:00:00.000Z');
const IDEM_CREATED_AT = new Date('2026-01-02T00:00:00.000Z');

async function applyCommit(userId: string, sessionId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(
      'INSERT INTO "IdempotencyKey" ("userId", "key", "createdAt", "payload") VALUES ($1, $2, $3, $4::jsonb)',
      userId,
      IDEM_KEY,
      IDEM_CREATED_AT,
      JSON.stringify({ source: 'semantics-idempotency' })
    );

    await tx.autopilotCommit.create({
      data: {
        userId,
        sessionId,
        decisionId: DECISION_ID,
      },
    });
  });
}

async function run(): Promise<void> {
  let userId: string | null = null;
  let sessionId: string | null = null;

  try {
    await prisma.user.deleteMany({ where: { email: EMAIL } });
    const user = await prisma.user.create({ data: { email: EMAIL } });
    userId = user.id;

    const session = await prisma.recommendationSession.create({
      data: {
        userId,
        category: 'DINING',
        amountCents: 1200,
        orderToken: ORDER_TOKEN,
        source: 'AUTOPILOT',
        verdict: 'HEALTHY',
        status: 'RECOMMENDED',
        expiresAt: EXPIRES_AT,
        budgetVerdict: 'HEALTHY',
        cardVerdict: 'OPTIMAL',
        overallVerdict: 'GREEN',
        coverageMode: 'BUDGETED',
      },
    });
    sessionId = session.id;

    await applyCommit(userId, sessionId);

    let error: unknown = null;
    try {
      await applyCommit(userId, sessionId);
    } catch (err) {
      error = err;
    }

    if (error === null) {
      throw new Error('Expected idempotent apply to fail on second attempt');
    }

    assertUniqueViolation(error, ['IdempotencyKey_pkey']);

    const idempotencyCount = await prisma.idempotencyKey.count({
      where: { userId, key: IDEM_KEY },
    });
    assert.equal(idempotencyCount, 1, 'expected single idempotency key row');

    const commitCount = await prisma.autopilotCommit.count({
      where: { userId, decisionId: DECISION_ID },
    });
    assert.equal(commitCount, 1, 'expected single autopilot commit row');

    console.warn('db-semantics-idempotency: ok');
  } finally {
    if (userId !== null) {
      await prisma.autopilotCommit.deleteMany({ where: { userId, decisionId: DECISION_ID } });
      await prisma.idempotencyKey.deleteMany({ where: { userId, key: IDEM_KEY } });
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
