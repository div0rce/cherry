import * as assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), '..', '..');
const fixturesRoot = path.join(repoRoot, 'tests', 'fixtures', 'guardrails', 'ts-coverage');
const guardrailArgs = ['run', 'ts:esm', '--', 'scripts/check-ts-coverage.mts'];

type Fixture = {
  name: string;
  shouldPass: boolean;
};

const fixtures: Fixture[] = [
  { name: 'ok', shouldPass: true },
  { name: 'orphan', shouldPass: false },
  { name: 'overlap', shouldPass: false },
];

for (const fixture of fixtures) {
  const root = path.join(fixturesRoot, fixture.name);
  const result = spawnSync('npm', guardrailArgs, {
    cwd: repoRoot,
    encoding: 'utf8',
    env: {
      ...process.env,
      CHERRY_TS_COVERAGE_ROOT: root,
    },
  });
  const stdout = result.stdout ?? '';
  const stderr = result.stderr ?? '';

  if (fixture.shouldPass) {
    assert.equal(result.status, 0, `expected ts-coverage to pass for ${fixture.name}`);
    assert.ok(
      stdout.includes('check:ts-coverage: ok'),
      `expected success output for ${fixture.name}`
    );
  } else {
    assert.notEqual(result.status, 0, `expected ts-coverage to fail for ${fixture.name}`);
    assert.ok(
      stderr.includes('check:ts-coverage'),
      `expected guardrail output for ${fixture.name}`
    );
  }
}

process.stdout.write('ts-coverage: ok\n');
