import * as assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), '..', '..', '..');

const result = spawnSync(
  'npm',
  ['run', 'ts:esm', '--', 'scripts/check-guardrail-self.mts'],
  {
    cwd: repoRoot,
    encoding: 'utf8',
    env: {
      ...process.env,
      CHERRY_GUARDRAIL_SELF_FIXTURE: '1',
    },
  }
);

const stderr = result.stderr ?? '';

assert.notEqual(
  result.status,
  0,
  `expected guardrail self-consistency check to fail, got status=${result.status ?? 'null'}`
);
assert.equal(
  stderr.includes('check:guardrail-self'),
  true,
  `expected check:guardrail-self output, got: ${stderr}`
);

process.stdout.write('guardrail-self-consistency: ok\n');
