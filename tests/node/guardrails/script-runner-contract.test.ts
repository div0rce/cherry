import * as assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), '..', '..', '..');
const fixturesRoot = path.join(
  repoRoot,
  'tests',
  'fixtures',
  'guardrails',
  'script-runner-contract',
);

type Fixture = {
  name: string;
  shouldPass: boolean;
};

const fixtures: Fixture[] = [
  { name: 'ok', shouldPass: true },
  { name: 'bad-direct-runner', shouldPass: false },
];

for (const fixture of fixtures) {
  const fixtureRoot = path.join(fixturesRoot, fixture.name);
  const result = spawnSync(
    'npm',
    ['run', 'ts:esm', '--', 'scripts/check-script-runner-contract.mts'],
    {
      cwd: repoRoot,
      encoding: 'utf8',
      env: {
        ...process.env,
        CHERRY_SCRIPT_RUNNER_CONTRACT_ROOT: fixtureRoot,
      },
    },
  );

  const stdout = result.stdout ?? '';
  const stderr = result.stderr ?? '';

  if (fixture.shouldPass) {
    assert.equal(
      result.status,
      0,
      `expected script-runner-contract to pass for ${fixture.name}, got status=${result.status ?? 'null'}`,
    );
    assert.equal(
      stdout.includes('script-runner-contract: ok'),
      true,
      `expected script-runner-contract ok output for ${fixture.name}, got: ${stdout}`,
    );
  } else {
    assert.notEqual(
      result.status,
      0,
      `expected script-runner-contract to fail for ${fixture.name}, got status=${result.status ?? 'null'}`,
    );
    assert.equal(
      stderr.includes('check:script-runner-contract'),
      true,
      `expected check:script-runner-contract output for ${fixture.name}, got: ${stderr}`,
    );
  }
}

process.stdout.write('script-runner-contract: ok\n');
