import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';

const MIGRATION_PATH = path.join(
  process.cwd(),
  'prisma',
  'migrations',
  '20260112061227_drop_cherry_point_ledger_session_id_index',
  'migration.sql'
);

const REQUIRED_MARKERS = ['DROP INDEX "CherryPointLedger_sessionId_idx"'] as const;

const sql = fs.readFileSync(MIGRATION_PATH, 'utf8');

for (const marker of REQUIRED_MARKERS) {
  assert.ok(sql.includes(marker), `missing marker in migration: ${marker}`);
}

console.warn('migration-safety-drop-ledger-session-index: ok');
