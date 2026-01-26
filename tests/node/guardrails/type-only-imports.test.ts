import * as assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), '..', '..', '..');
const fixtureRoot = path.join(
  repoRoot,
  'tests',
  'fixtures',
  'guardrails',
  'type-only-imports'
);

const result = spawnSync(
  'npm',
  ['run', 'ts:esm', '--', 'scripts/check-type-only-imports.mts'],
  {
    cwd: repoRoot,
    encoding: 'utf8',
    env: {
      ...process.env,
      CHERRY_TYPE_ONLY_IMPORTS_ROOT: fixtureRoot,
    },
  }
);

const stderr = result.stderr ?? '';

assert.notEqual(
  result.status,
  0,
  `expected type-only-imports to fail, got status=${result.status ?? 'null'}`
);
assert.equal(
  stderr.includes('check:type-only-imports'),
  true,
  `expected check:type-only-imports output, got: ${stderr}`
);

process.stdout.write('type-only-imports: ok\n');
