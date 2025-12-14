#!/usr/bin/env node
import { PrismaClient } from '@prisma/client';

if (!process.env.DATABASE_URL) {
  console.error('check:db-smoke failed: DATABASE_URL is missing');
  process.exit(1);
}

const prisma = new PrismaClient();

async function main() {
  try {
    await prisma.$connect();
    await prisma.user.count();
    await prisma.recommendationSession.count({ where: { source: 'AUTOPILOT' } });
    await prisma.autopilotCommit.count();
    console.log('check:db-smoke ok');
  } catch (err) {
    console.error('check:db-smoke failed');
    console.error(err instanceof Error ? err.stack ?? err.message : err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}

main();
