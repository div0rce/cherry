import * as assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), '..', '..', '..');
const fixtureRoot = path.join(
  repoRoot,
  'tests',
  'fixtures',
  'guardrails',
  'no-ts-extension-imports'
);

const result = spawnSync(
  'npm',
  ['run', 'ts:esm', '--', 'scripts/check-no-ts-extension-imports.mts'],
  {
    cwd: repoRoot,
    encoding: 'utf8',
    env: {
      ...process.env,
      CHERRY_NO_TS_EXTENSION_IMPORTS_ROOT: fixtureRoot,
    },
  }
);

const stderr = result.stderr ?? '';

assert.notEqual(
  result.status,
  0,
  `expected no-ts-extension-imports to fail, got status=${result.status ?? 'null'}`
);
assert.equal(
  stderr.includes('check:no-ts-extension-imports'),
  true,
  `expected check:no-ts-extension-imports output, got: ${stderr}`
);

process.stdout.write('no-ts-extension-imports: ok\n');
