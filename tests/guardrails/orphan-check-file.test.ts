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
  'orphan-check-file'
);

const result = spawnSync(
  'npm',
  ['run', 'ts:esm', '--', 'scripts/check-no-orphan-check-files.mts'],
  {
    cwd: repoRoot,
    encoding: 'utf8',
    env: {
      ...process.env,
      CHERRY_GUARDRAIL_REGISTRY_ROOT: fixtureRoot,
    },
  }
);

const stderr = result.stderr ?? '';

assert.notEqual(
  result.status,
  0,
  `expected no-orphan-check-files to fail, got status=${result.status ?? 'null'}`
);
assert.equal(
  stderr.includes('check:no-orphan-check-files'),
  true,
  `expected check:no-orphan-check-files prefix, got: ${stderr}`
);

process.stdout.write('orphan-check-file: ok\n');
