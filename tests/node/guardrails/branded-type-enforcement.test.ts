import * as assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), '..', '..', '..');

const result = spawnSync(
  'npm',
  ['run', 'ts:esm', '--', 'scripts/check-branded-literal.mts'],
  {
    cwd: repoRoot,
    encoding: 'utf8',
    env: {
      ...process.env,
      CHERRY_BRANDED_LITERAL_FIXTURE: '1',
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
  stderr.includes('IsoDateString'),
  true,
  `expected IsoDateString violation output, got: ${stderr}`
);

process.stdout.write('branded-type-enforcement: ok\n');
