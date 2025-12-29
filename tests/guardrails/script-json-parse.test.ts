import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), '..', '..');
const fixtureRoot = path.join(repoRoot, 'tests', 'fixtures', 'guardrails', 'script-json-parse');

const result = spawnSync(
  'npm',
  ['run', 'ts:esm', '--', 'scripts/check-script-json-parse.mts'],
  {
    cwd: repoRoot,
    encoding: 'utf8',
    env: {
      ...process.env,
      CHERRY_SCRIPT_JSON_PARSE_ROOT: fixtureRoot,
    },
  }
);

const stderr = result.stderr ?? '';

assert.notEqual(
  result.status,
  0,
  `expected script-json-parse to fail, got status=${result.status ?? 'null'}`
);
assert.equal(
  stderr.includes('check:script-json-parse'),
  true,
  `expected check:script-json-parse output, got: ${stderr}`
);

process.stdout.write('script-json-parse: ok\n');
