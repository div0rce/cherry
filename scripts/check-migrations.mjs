#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const migrationsDir = path.join(process.cwd(), 'prisma', 'migrations');
const banned = [/TODO/i, /STUB/i, /FIXME/i];

function fail(msg) {
  console.error(msg);
  process.exit(1);
}

if (!fs.existsSync(migrationsDir)) {
  fail('prisma/migrations directory not found.');
}

const entries = fs
  .readdirSync(migrationsDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory());

for (const entry of entries) {
  if (entry.name === 'migration_lock.toml') continue;
  const migrationPath = path.join(migrationsDir, entry.name, 'migration.sql');
  if (!fs.existsSync(migrationPath)) {
    fail(`Migration ${entry.name} is missing migration.sql`);
  }
  const content = fs.readFileSync(migrationPath, 'utf8');
  if (content.trim().length === 0) {
    fail(`Migration ${entry.name} has empty migration.sql`);
  }
  for (const pattern of banned) {
    if (pattern.test(content)) {
      fail(`Migration ${entry.name} contains banned marker (${pattern.source}).`);
    }
  }
}

console.log('Migration hygiene check passed.');
