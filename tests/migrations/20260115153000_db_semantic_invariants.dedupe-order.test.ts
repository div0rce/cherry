import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const MIGRATION_PATH = path.join(
  process.cwd(),
  'prisma',
  'migrations',
  '20260115153000_db_semantic_invariants',
  'migration.sql'
);

const REQUIRED_MARKERS = [
  'row_number() OVER',
  'CASE "status"',
  "WHEN 'REVOKED' THEN 3",
  "WHEN 'POSTED' THEN 2",
  "WHEN 'PENDING' THEN 1",
  '"createdAt" DESC',
] as const;

const sql = fs.readFileSync(MIGRATION_PATH, 'utf8');

for (const marker of REQUIRED_MARKERS) {
  assert.ok(sql.includes(marker), `missing dedupe ordering marker: ${marker}`);
}

console.warn('migration-safety-db-semantic-invariants-dedupe: ok');
