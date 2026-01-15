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
  'guardrail-no-runtime-io'
);

const result = spawnSync(
  'npm',
  ['run', 'ts:esm', '--', 'scripts/check-guardrail-no-runtime-io.mts'],
  {
    cwd: repoRoot,
    encoding: 'utf8',
    env: {
      ...process.env,
      CHERRY_GUARDRAIL_NO_RUNTIME_IO_ROOT: fixtureRoot,
    },
  }
);

const stderr = result.stderr ?? '';

assert.notEqual(
  result.status,
  0,
  `expected guardrail-no-runtime-io to fail, got status=${result.status ?? 'null'}`
);
assert.equal(
  stderr.includes('check:guardrail-no-runtime-io'),
  true,
  `expected check:guardrail-no-runtime-io output, got: ${stderr}`
);

process.stdout.write('guardrail-no-runtime-io: ok\n');
