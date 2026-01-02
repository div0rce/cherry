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
  'check-contract'
);

const result = spawnSync(
  'npm',
  ['run', 'ts:esm', '--', 'scripts/check-check-contract.mts'],
  {
    cwd: repoRoot,
    encoding: 'utf8',
    env: {
      ...process.env,
      CHERRY_CHECK_CONTRACT_ROOT: fixtureRoot,
    },
  }
);

const stderr = result.stderr ?? '';

assert.notEqual(
  result.status,
  0,
  `expected check-contract to fail, got status=${result.status ?? 'null'}`
);
assert.equal(
  stderr.includes('check:check-contract'),
  true,
  `expected check:check-contract output, got: ${stderr}`
);

process.stdout.write('check-contract: ok\n');
