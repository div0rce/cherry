import { PrismaClient } from '@prisma/client';
import { ensureTsEsm } from './lib/ensure-ts-esm.mjs';
import { asMessage } from './guardrails/lib/error.mjs';
import { fail } from './guardrails/lib/fail.mjs';

ensureTsEsm();

const PREFIX = 'check:db:optional';
const FIX = 'Set DATABASE_URL to a reachable database or run check:db:required in a provisioned env.';
const databaseUrl = process.env['DATABASE_URL'];
const strict = process.env['CHERRY_STRICT'] === '1';

if (databaseUrl === undefined || databaseUrl === '') {
  const message = 'SKIP check:db:optional reason=DATABASE_URL missing';
  if (strict) {
    fail(PREFIX, message, { fix: FIX });
  }
  process.stdout.write(`${message}\n`);
} else {
  const prisma = new PrismaClient();
  try {
    await prisma.$connect();
    await prisma.$queryRawUnsafe('SELECT 1');
    process.stdout.write('OK check:db:optional database reachable\n');
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
}
