import * as assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), '..', '..', '..');
const fixtures = [
  'guardrail-exec-bypass',
  'guardrail-exec-bypass-npx-tsx',
  'guardrail-exec-bypass-nested',
  'guardrail-exec-bypass-docs',
  'guardrail-exec-bypass-workflow',
];

for (const fixture of fixtures) {
  const fixtureRoot = path.join(repoRoot, 'tests', 'fixtures', 'guardrails', fixture);
  const result = spawnSync(
    'npm',
    ['run', 'ts:esm', '--', 'scripts/check-guardrail-execution.mts'],
    {
      cwd: repoRoot,
      encoding: 'utf8',
      env: {
        ...process.env,
        CHERRY_GUARDRAIL_EXECUTION_ROOT: fixtureRoot,
      },
    }
  );

  const stderr = result.stderr ?? '';

  assert.notEqual(
    result.status,
    0,
    `expected guardrail-execution to fail for ${fixture}, got status=${
      result.status ?? 'null'
    }`
  );
  assert.equal(
    stderr.includes('check:guardrail-execution'),
    true,
    `expected check:guardrail-execution output for ${fixture}, got: ${stderr}`
  );
}

process.stdout.write('guardrail-exec-bypass: ok\n');
