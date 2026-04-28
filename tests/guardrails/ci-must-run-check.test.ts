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

function runFixture(name: string): ReturnType<typeof spawnSync> {
  return spawnSync('npm', ['run', 'ts:esm', '--', 'scripts/check-ci-must-run-check.mts'], {
    cwd: repoRoot,
    encoding: 'utf8',
    env: {
      ...process.env,
      CHERRY_CI_MUST_RUN_CHECK_ROOT: path.join(fixtureRoot, name),
    },
  });
}

const okResult = runFixture('ok');
assert.equal(
  okResult.status,
  0,
  `expected ok fixture to pass, got stderr=${okResult.stderr ?? ''}`
);

const missingResult = runFixture('missing-ci-verify');
const missingStderr = missingResult.stderr ?? '';

assert.notEqual(
  missingResult.status,
  0,
  `expected missing-ci-verify to fail, got status=${missingResult.status ?? 'null'}`
);
assert.equal(
  missingStderr.includes('check:ci-must-run-check'),
  true,
  `expected check:ci-must-run-check output, got: ${missingStderr}`
);

const directRuntimeResult = runFixture('direct-runtime');
const directRuntimeStderr = directRuntimeResult.stderr ?? '';
assert.notEqual(
  directRuntimeResult.status,
  0,
  `expected direct-runtime to fail, got status=${directRuntimeResult.status ?? 'null'}`
);
assert.equal(
  directRuntimeStderr.includes('direct runtime scripts'),
  true,
  `expected direct runtime failure, got: ${directRuntimeStderr}`
);

process.stdout.write('ci-must-run-check: ok\n');
