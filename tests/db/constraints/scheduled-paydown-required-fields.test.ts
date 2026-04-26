import * as assert from 'node:assert/strict';
import { Prisma, PrismaClient } from '@prisma/client';
import { assertPrismaError, getPrismaMetaString } from '../_helpers/assert-prisma-error.js';

const prisma = new PrismaClient();

const NOT_NULL_CONSTRAINTS = [
  'NOT_NULL:f50fabe118a5',
  'NOT_NULL:fcfdd60f72c0',
  'NOT_NULL:ea43b710a722',
  'NOT_NULL:d1b907e61215',
  'NOT_NULL:dcf1e54e7550',
  'NOT_NULL:7f5189136236',
  'NOT_NULL:4d91c9ee69ec',
  'NOT_NULL:2531d62fd8ed',
] as const;

void NOT_NULL_CONSTRAINTS;

const EMAIL = 'db-constraints-scheduled-paydowns@cherry.local';
const FK_USER = 'scheduled_paydown__user_id__fk';

type ScheduledPaydownColumn =
  | 'id'
  | 'userId'
  | 'amountCents'
  | 'effectiveAt'
  | 'status'
  | 'source'
  | 'createdAt'
  | 'updatedAt';

const REQUIRED_COLUMNS: ScheduledPaydownColumn[] = [
  'id',
  'userId',
  'amountCents',
  'effectiveAt',
  'status',
  'source',
  'createdAt',
  'updatedAt',
];

function baseRow(userId: string): Record<ScheduledPaydownColumn, unknown> {
  const at = new Date('2024-01-01T00:00:00Z');
  return {
    id: 'scheduled-paydown-db-truth',
    userId,
    amountCents: 1000,
    effectiveAt: at,
    status: 'SCHEDULED',
    source: 'USER_SCHEDULED',
    createdAt: at,
    updatedAt: at,
  };
}

async function insertScheduledPaydown(
  row: Record<ScheduledPaydownColumn, unknown>
): Promise<void> {
  await prisma.$executeRawUnsafe(
    'INSERT INTO "ScheduledPaydown" ("id", "userId", "amountCents", "effectiveAt", "status", "source", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
    row.id,
    row.userId,
    row.amountCents,
    row.effectiveAt,
    row.status,
    row.source,
    row.createdAt,
    row.updatedAt
  );
}

function assertRawSqlCode(error: unknown, expected: '23502' | '23503'): void {
  assertPrismaError(error);
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    assert.equal(error.code, 'P2010', 'expected raw query failure');
    const code = getPrismaMetaString(error, 'code');
    if (code !== undefined) {
      assert.equal(code, expected);
    } else {
      assert.ok(String(error).includes(expected), `expected SQLSTATE ${expected}`);
    }
    return;
  }

  if (error instanceof Prisma.PrismaClientUnknownRequestError) {
    assert.ok(String(error).includes(expected), `expected SQLSTATE ${expected}`);
    return;
  }

  throw new Error(`Expected Prisma client error, got ${String(error)}`);
}

async function run(): Promise<void> {
  let userId: string | null = null;

  try {
    await prisma.user.deleteMany({ where: { email: EMAIL } });
    const user = await prisma.user.create({ data: { email: EMAIL } });
    userId = user.id;

    for (const column of REQUIRED_COLUMNS) {
      let error: unknown = null;
      try {
        await insertScheduledPaydown({
          ...baseRow(userId),
          id: `scheduled-paydown-db-truth-${column}`,
          [column]: null,
        });
      } catch (err) {
        error = err;
      }

      if (error === null) {
        throw new Error(`Expected NOT NULL violation on ScheduledPaydown.${column}`);
      }
      assertRawSqlCode(error, '23502');
    }

    let fkError: unknown = null;
    try {
      await insertScheduledPaydown({
        ...baseRow('missing-user-id'),
        id: 'scheduled-paydown-missing-user',
      });
    } catch (err) {
      fkError = err;
    }

    if (fkError === null) {
      throw new Error('Expected foreign key violation on ScheduledPaydown.userId');
    }
    assertPrismaError(fkError);
    if (fkError instanceof Prisma.PrismaClientKnownRequestError) {
      assert.equal(fkError.code, 'P2010', 'expected raw query failure');
      const code = getPrismaMetaString(fkError, 'code');
      if (code !== undefined) {
        assert.equal(code, '23503', 'expected foreign key SQLSTATE');
      }
      assert.ok(String(fkError).includes(FK_USER) || String(fkError).includes('23503'));
    } else if (fkError instanceof Prisma.PrismaClientUnknownRequestError) {
      assert.ok(String(fkError).includes(FK_USER) || String(fkError).includes('23503'));
    } else {
      throw new Error(`Expected Prisma client error, got ${String(fkError)}`);
    }

    console.warn('db-constraints-scheduled-paydown-required-fields: ok');
  } finally {
    if (userId !== null) {
      await prisma.$executeRawUnsafe('DELETE FROM "ScheduledPaydown" WHERE "userId" = $1', userId);
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
