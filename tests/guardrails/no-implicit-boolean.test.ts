import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), '..', '..');

const result = spawnSync(
  'npm',
  ['run', 'ts:esm', '--', 'scripts/check-no-implicit-boolean.mts'],
  {
    cwd: repoRoot,
    encoding: 'utf8',
    env: {
      ...process.env,
      CHERRY_IMPLICIT_BOOLEAN_FIXTURE: '1',
    },
  }
);

const stderr = result.stderr ?? '';

assert.notEqual(
  result.status,
  0,
  `expected guardrail to fail for fixture, got status=${result.status ?? 'null'}`
);
assert.equal(
  stderr.includes('implicit boolean'),
  true,
  `expected guardrail error output, got: ${stderr}`
);

process.stdout.write('no-implicit-boolean: ok\n');
