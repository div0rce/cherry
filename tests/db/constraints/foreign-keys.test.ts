import * as assert from 'node:assert/strict';
import { Prisma, PrismaClient } from '@prisma/client';
import { assertPrismaError } from '../_helpers/assert-prisma-error.js';

const prisma = new PrismaClient();

async function run(): Promise<void> {
  const email = 'db-constraints-foreign-keys@cherry.local';
  const cardData = {
    nickname: 'DB Constraint Card',
    issuer: 'DBISSUER',
    network: 'VISA',
    isCredit: true,
  };

  let userId: string | null = null;
  let cardId: string | null = null;

  try {
    let error: unknown = null;
    try {
      await prisma.card.create({
        data: {
          userId: 'missing-user-id',
          ...cardData,
        },
      });
    } catch (err) {
      error = err;
    }

    if (error === null) {
      throw new Error('Expected foreign key violation on Card.userId');
    }
    assertPrismaError(error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      assert.equal(error.code, 'P2003', 'expected foreign key constraint violation');
    } else {
      throw new Error(`Expected PrismaClientKnownRequestError, got ${String(error)}`);
    }

    await prisma.user.deleteMany({ where: { email } });
    const user = await prisma.user.create({ data: { email } });
    userId = user.id;

    const card = await prisma.card.create({
      data: {
        userId,
        ...cardData,
      },
    });
    cardId = card.id;

    await prisma.user.delete({ where: { id: userId } });
    const remaining = await prisma.card.count({ where: { id: cardId } });
    assert.equal(remaining, 0, 'expected cascade delete on Card');

    console.warn('db-constraints-foreign-keys: ok');
  } finally {
    if (cardId !== null) {
      await prisma.card.deleteMany({ where: { id: cardId } });
    }
    if (userId !== null) {
      await prisma.user.deleteMany({ where: { id: userId } });
    }
    await prisma.user.deleteMany({ where: { email } });
    await prisma.$disconnect();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
