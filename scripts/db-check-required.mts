import { PrismaClient } from '@prisma/client';
import { ensureTsEsm } from './lib/ensure-ts-esm.mjs';
import { asMessage } from './guardrails/lib/error.mjs';
import { fail } from './guardrails/lib/fail.mjs';

ensureTsEsm();

const PREFIX = 'check:db:required';
const FIX = 'Set DATABASE_URL to a reachable database before running check:db:required.';
const databaseUrl = process.env.DATABASE_URL;

if (databaseUrl === undefined || databaseUrl.length === 0) {
  fail(PREFIX, 'DATABASE_URL is missing', { fix: FIX });
}

const prisma = new PrismaClient({
  datasources: {
    db: { url: databaseUrl },
  },
});

try {
  await prisma.$connect();
  await prisma.$queryRawUnsafe('SELECT 1');
} catch (error: unknown) {
  const message = asMessage(error);
  fail(PREFIX, `Database check failed: ${message}`, { fix: FIX });
} finally {
  try {
    await prisma.$disconnect();
  } catch (error: unknown) {
    void asMessage(error);
  }
}
