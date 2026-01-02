#!/usr/bin/env node
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { asMessage } from './guardrails/lib/error.mts';
import { fail } from './guardrails/lib/fail.mts';

// Load local env files so the predev check works before Next.js hydrates env vars
function loadEnv() {
  const envFiles = ['.env.local', '.env'];
  for (const file of envFiles) {
    const fullPath = path.join(process.cwd(), file);
    if (fs.existsSync(fullPath) === false) continue;

    const lines = fs.readFileSync(fullPath, 'utf8').split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.length === 0 || trimmed.startsWith('#')) continue;
      const equalsIndex = trimmed.indexOf('=');
      if (equalsIndex === -1) continue;

      const key = trimmed.slice(0, equalsIndex).trim();
      let value = trimmed.slice(equalsIndex + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      if (Object.prototype.hasOwnProperty.call(process.env, key) === false) {
        process.env[key] = value;
      }
    }
  }
}

loadEnv();

const schema = 'prisma/schema.prisma';
const PREFIX = 'db-ready';
const FIX = [
  'Ensure DATABASE_URL is set and reachable.',
  'Apply migrations: npx prisma migrate deploy.',
  'For local dev only: npx prisma migrate reset --force.',
];

const databaseUrl = process.env['DATABASE_URL'];
if (databaseUrl === undefined || databaseUrl === '') {
  fail(PREFIX, 'DATABASE_URL is missing. Start your database or set DATABASE_URL, then apply migrations.', {
    fix: FIX,
  });
}

try {
  execSync(`npx prisma migrate status --schema=${schema}`, { stdio: 'inherit' });
} catch (err: unknown) {
  void asMessage(err);
  fail(PREFIX, 'Prisma database is not ready (unapplied migrations or unreachable DB). See above for details.', {
    fix: FIX,
  });
}
