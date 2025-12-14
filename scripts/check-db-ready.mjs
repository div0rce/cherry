#!/usr/bin/env node
import { execSync } from 'node:child_process';

const schema = 'prisma/schema.prisma';

function fail(message) {
  console.error(message);
  console.error('\nFix:');
  console.error('  - Ensure DATABASE_URL is set and reachable');
  console.error('  - Apply migrations: npx prisma migrate deploy');
  console.error('  - For local dev only: npx prisma migrate reset --force');
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  fail('DATABASE_URL is missing. Start your database or set DATABASE_URL, then apply migrations.');
}

try {
  execSync(`npx prisma migrate status --schema=${schema}`, { stdio: 'inherit' });
} catch {
  fail(
    'Prisma database is not ready (unapplied migrations or unreachable DB). See above for details.'
  );
}
