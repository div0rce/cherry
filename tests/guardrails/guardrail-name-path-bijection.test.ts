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
  'guardrail-name-path-bijection'
);

const result = spawnSync(
  'npm',
  ['run', 'ts:esm', '--', 'scripts/check-guardrail-name-path-bijection.mts'],
  {
    cwd: repoRoot,
    encoding: 'utf8',
    env: {
      ...process.env,
      CHERRY_GUARDRAIL_REGISTRY_ROOT: fixtureRoot,
    },
  }
);

const stderr = result.stderr ?? '';

assert.notEqual(
  result.status,
  0,
  `expected guardrail-name-path-bijection to fail, got status=${result.status ?? 'null'}`
);
assert.equal(
  stderr.includes('NAME_PATH_MISMATCH'),
  true,
  `expected NAME_PATH_MISMATCH prefix, got: ${stderr}`
);

process.stdout.write('guardrail-name-path-bijection: ok\n');
