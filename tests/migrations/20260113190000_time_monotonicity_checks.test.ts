import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';

const MIGRATION_PATH = path.join(
  process.cwd(),
  'prisma',
  'migrations',
  '20260113190000_time_monotonicity_checks',
  'migration.sql'
);

const REQUIRED_CONSTRAINTS = [
  'cherry_point_ledger__posted_at__check',
  'cherry_point_ledger__revoked_at__check',
  'recommendation_session__verified_at__check',
  'recommendation_session__rejected_at__check',
] as const;

const sql = fs.readFileSync(MIGRATION_PATH, 'utf8');

for (const name of REQUIRED_CONSTRAINTS) {
  assert.ok(sql.includes(name), `missing constraint in migration: ${name}`);
}

console.warn('migration-safety-time-monotonicity: ok');
