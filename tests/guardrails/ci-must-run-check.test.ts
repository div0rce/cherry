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
  'ci-must-run-check'
);

const result = spawnSync(
  'npm',
  ['run', 'ts:esm', '--', 'scripts/check-ci-must-run-check.mts'],
  {
    cwd: repoRoot,
    encoding: 'utf8',
    env: {
      ...process.env,
      CHERRY_CI_MUST_RUN_CHECK_ROOT: fixtureRoot,
    },
  }
);

const stderr = result.stderr ?? '';

assert.notEqual(
  result.status,
  0,
  `expected ci-must-run-check to fail, got status=${result.status ?? 'null'}`
);
assert.equal(
  stderr.includes('check:ci-must-run-check'),
  true,
  `expected check:ci-must-run-check output, got: ${stderr}`
);

process.stdout.write('ci-must-run-check: ok\n');
