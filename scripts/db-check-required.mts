import { PrismaClient } from '@prisma/client';

const databaseUrl = process.env.DATABASE_URL;
if (databaseUrl === undefined || databaseUrl.length === 0) {
  throw new Error('check:db:required failed: DATABASE_URL missing');
}

const prisma = new PrismaClient({
  datasources: {
    db: { url: databaseUrl },
  },
});

try {
  await prisma.$connect();
  await prisma.$queryRawUnsafe('SELECT 1');
} catch (err) {
  throw new Error(`check:db:required failed: ${(err as Error).message}`);
} finally {
  await prisma.$disconnect();
}
