import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), '..', '..');
const fixtureRoot = path.join(repoRoot, 'tests', 'fixtures', 'guardrails', 'npm-arg-forwarding');

const result = spawnSync(
  'npm',
  ['run', 'ts:esm', '--', 'scripts/check-npm-arg-forwarding.mts'],
  {
    cwd: repoRoot,
    encoding: 'utf8',
    env: {
      ...process.env,
      CHERRY_NPM_ARG_FORWARDING_ROOT: fixtureRoot,
    },
  }
);

const stderr = result.stderr ?? '';

assert.notEqual(
  result.status,
  0,
  `expected npm-arg-forwarding to fail, got status=${result.status ?? 'null'}`
);
assert.equal(
  stderr.includes('check:npm-arg-forwarding'),
  true,
  `expected check:npm-arg-forwarding output, got: ${stderr}`
);

process.stdout.write('npm-arg-forwarding: ok\n');
