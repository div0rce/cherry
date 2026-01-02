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
  'no-script-alias-imports'
);

const result = spawnSync(
  'npm',
  ['run', 'ts:esm', '--', 'scripts/check-no-script-alias-imports.mts'],
  {
    cwd: repoRoot,
    encoding: 'utf8',
    env: {
      ...process.env,
      CHERRY_NO_SCRIPT_ALIAS_IMPORTS_ROOT: fixtureRoot,
    },
  }
);

const stderr = result.stderr ?? '';

assert.notEqual(
  result.status,
  0,
  `expected no-script-alias-imports to fail, got status=${result.status ?? 'null'}`
);
assert.equal(
  stderr.includes('check:no-script-alias-imports'),
  true,
  `expected check:no-script-alias-imports output, got: ${stderr}`
);

process.stdout.write('no-script-alias-imports: ok\n');
