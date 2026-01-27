import * as assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), '..', '..', '..');
const fixturesRoot = path.join(repoRoot, 'tests', 'fixtures', 'guardrails', 'no-vendor-shims');
const guardrailArgs = ['run', 'ts:esm', '--', 'scripts/check-no-vendor-shims.mts'];

type Fixture = {
  name: string;
  shouldPass: boolean;
};

const fixtures: Fixture[] = [
  { name: 'ok', shouldPass: true },
  { name: 'bad', shouldPass: false },
  { name: 'allowlisted', shouldPass: true },
  { name: 'patch-allowlisted', shouldPass: true },
  { name: 'compat-bad', shouldPass: false },
];

for (const fixture of fixtures) {
  const root = path.join(fixturesRoot, fixture.name);
  const result = spawnSync('npm', guardrailArgs, {
    cwd: repoRoot,
    encoding: 'utf8',
    env: {
      ...process.env,
      CHERRY_NO_VENDOR_SHIMS_ROOT: root,
    },
  });
  const stdout = result.stdout ?? '';
  const stderr = result.stderr ?? '';

  if (fixture.shouldPass) {
    assert.equal(
      result.status,
      0,
      `expected no-vendor-shims to pass for ${fixture.name}`
    );
    assert.ok(
      stdout.includes('check:no-vendor-shims: ok'),
      `expected success output for ${fixture.name}`
    );
  } else {
    assert.notEqual(
      result.status,
      0,
      `expected no-vendor-shims to fail for ${fixture.name}`
    );
    assert.ok(
      stderr.includes('check:no-vendor-shims'),
      `expected guardrail output for ${fixture.name}`
    );
  }
}

process.stdout.write('no-vendor-shims: ok\n');
