#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fail } from './guardrails/lib/fail.mts';

const migrationsDir = path.join(process.cwd(), 'prisma', 'migrations');
const banned = [/TODO/i, /STUB/i, /FIXME/i];
const PREFIX = 'check:migrations';
const FIX = 'Fix migration SQL or remove banned markers.';

if (!fs.existsSync(migrationsDir)) {
  fail(PREFIX, 'prisma/migrations directory not found.', { fix: FIX });
}

const entries = fs
  .readdirSync(migrationsDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory());

for (const entry of entries) {
  if (entry.name === 'migration_lock.toml') continue;
  const migrationPath = path.join(migrationsDir, entry.name, 'migration.sql');
  if (!fs.existsSync(migrationPath)) {
    fail(PREFIX, `Migration ${entry.name} is missing migration.sql`, { fix: FIX });
  }
  const content = fs.readFileSync(migrationPath, 'utf8');
  if (content.trim().length === 0) {
    fail(PREFIX, `Migration ${entry.name} has empty migration.sql`, { fix: FIX });
  }
  for (const pattern of banned) {
    if (pattern.test(content)) {
      fail(PREFIX, `Migration ${entry.name} contains banned marker (${pattern.source}).`, {
        fix: FIX,
      });
    }
  }
}

process.stdout.write('Migration hygiene check passed.\n');
