import * as assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), '..', '..', '..');
const fixturesRoot = path.join(repoRoot, 'tests', 'fixtures', 'guardrails', 'check-contract');

type Fixture = {
  name: string;
  shouldPass: boolean;
};

const fixtures: Fixture[] = [
  { name: 'ok', shouldPass: true },
  { name: 'bad-guardrails-in-test', shouldPass: false },
  { name: 'bad-ci-verify', shouldPass: false },
];

for (const fixture of fixtures) {
  const fixtureRoot = path.join(fixturesRoot, fixture.name);
  const result = spawnSync(
    'npm',
    ['run', 'ts:esm', '--', 'scripts/check-check-contract.mts'],
    {
      cwd: repoRoot,
      encoding: 'utf8',
      env: {
        ...process.env,
        CHERRY_CHECK_CONTRACT_ROOT: fixtureRoot,
      },
    }
  );

  const stderr = result.stderr ?? '';
  const stdout = result.stdout ?? '';

  if (fixture.shouldPass) {
    assert.equal(
      result.status,
      0,
      `expected check-contract to pass for ${fixture.name}, got status=${result.status ?? 'null'}`
    );
    assert.equal(
      stdout.includes('check-contract: ok'),
      true,
      `expected check-contract ok output for ${fixture.name}, got: ${stdout}`
    );
  } else {
    assert.notEqual(
      result.status,
      0,
      `expected check-contract to fail for ${fixture.name}, got status=${result.status ?? 'null'}`
    );
    assert.equal(
      stderr.includes('check:check-contract'),
      true,
      `expected check:check-contract output for ${fixture.name}, got: ${stderr}`
    );
  }
}

process.stdout.write('check-contract: ok\n');
