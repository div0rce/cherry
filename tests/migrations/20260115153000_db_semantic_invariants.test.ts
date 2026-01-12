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
  'cherry_point_ledger__session_id__unique',
  'cherry_point_ledger__status_posted_at_revoked_at__check',
  'recommendation_session__status_verified_at_rejected_at__check',
  'cherry_point_ledger__session_status__check',
  'recommendation_session__ledger_status__check',
  'cherry_point_ledger__status_final__check',
  'recommendation_session__status_final__check',
] as const;

const sql = fs.readFileSync(MIGRATION_PATH, 'utf8');

for (const marker of REQUIRED_MARKERS) {
  assert.ok(sql.includes(marker), `missing marker in migration: ${marker}`);
}

console.warn('migration-safety-db-semantic-invariants: ok');
