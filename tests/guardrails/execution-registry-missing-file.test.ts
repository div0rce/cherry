import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), '..', '..');
const fixtureRoot = path.join(
  repoRoot,
  'tests',
  'fixtures',
  'guardrails',
  'execution-registry-missing-file'
);

const result = spawnSync(
  'npm',
  ['run', 'ts:esm', '--', 'scripts/check-execution-registry-completeness.mts'],
  {
    cwd: repoRoot,
    encoding: 'utf8',
    env: {
      ...process.env,
      CHERRY_EXECUTION_REGISTRY_ROOT: fixtureRoot,
    },
  }
);

const stderr = result.stderr ?? '';

assert.notEqual(
  result.status,
  0,
  `expected execution registry completeness to fail, got status=${result.status ?? 'null'}`
);
assert.equal(
  stderr.includes('check:execution-registry-completeness'),
  true,
  `expected check:execution-registry-completeness prefix, got: ${stderr}`
);

process.stdout.write('execution-registry-missing-file: ok\n');
