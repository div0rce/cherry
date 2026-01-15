import * as assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), '..', '..');
const fixtureRoot = path.join(
  repoRoot,
  'tests',
  'fixtures',
  'guardrails',
  'orphan-exec-script'
);

const result = spawnSync(
  'npm',
  ['run', 'ts:esm', '--', 'scripts/check-no-orphan-scripts.mts'],
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
  `expected no-orphan-scripts to fail, got status=${result.status ?? 'null'}`
);
assert.equal(
  stderr.includes('check:no-orphan-scripts'),
  true,
  `expected check:no-orphan-scripts prefix, got: ${stderr}`
);

process.stdout.write('orphan-exec-script: ok\n');
