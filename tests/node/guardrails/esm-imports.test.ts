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
  'esm-imports'
);

const result = spawnSync(
  'npm',
  ['run', 'ts:esm', '--', 'scripts/check-esm-imports.mts'],
  {
    cwd: repoRoot,
    encoding: 'utf8',
    env: {
      ...process.env,
      CHERRY_ESM_IMPORTS_ROOT: fixtureRoot,
    },
  }
);

const stderr = result.stderr ?? '';

assert.notEqual(
  result.status,
  0,
  `expected esm-imports to fail, got status=${result.status ?? 'null'}`
);
assert.equal(
  stderr.includes('check:esm-imports'),
  true,
  `expected check:esm-imports output, got: ${stderr}`
);

process.stdout.write('esm-imports: ok\n');
