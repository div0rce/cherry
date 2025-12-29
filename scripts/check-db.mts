#!/usr/bin/env node
import { PrismaClient } from '@prisma/client';
import { asMessage } from './guardrails/lib/error.mts';
import { fail } from './guardrails/lib/fail.mts';

const PREFIX = 'check:db';
const FIX = 'Set DATABASE_URL and ensure the database is reachable.';

const databaseUrl = process.env['DATABASE_URL'];
if (databaseUrl === undefined || databaseUrl === '') {
  fail(PREFIX, 'DATABASE_URL is missing', { fix: FIX });
}

const prisma = new PrismaClient();

async function main() {
  try {
    await prisma.$connect();
    await prisma.user.count();
    await prisma.recommendationSession.count({ where: { source: 'AUTOPILOT' } });
    await prisma.autopilotCommit.count();
    process.stdout.write('check:db ok\n');
  } catch (error: unknown) {
    const message = asMessage(error);
    await prisma.$disconnect().catch((error: unknown) => {
      void error;
    });
    fail(PREFIX, `Database check failed: ${message}`, { fix: FIX });
  } finally {
    await prisma.$disconnect().catch((error: unknown) => {
      void error;
    });
  }
}

void main();
