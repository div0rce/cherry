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
  'projected-liquid-cents'
);

function runFixture(name: string): ReturnType<typeof spawnSync> {
  return spawnSync(
    'npm',
    ['run', 'ts:esm', '--', 'scripts/check-projected-liquid-cents.mts'],
    {
      cwd: repoRoot,
      encoding: 'utf8',
      env: {
        ...process.env,
        CHERRY_PROJECTED_LIQUID_CENTS_ROOT: path.join(fixtureRoot, name),
      },
    }
  );
}

const failing = runFixture('bad');
const failingOutput = `${failing.stdout ?? ''}${failing.stderr ?? ''}`;
assert.notEqual(
  failing.status,
  0,
  `expected projected-liquid-cents fixture to fail, got status=${failing.status ?? 'null'}`
);
assert.equal(
  failingOutput.includes('check:projected-liquid-cents'),
  true,
  `expected check:projected-liquid-cents output, got: ${failingOutput}`
);
assert.equal(
  failingOutput.includes('projectedLiquidCents'),
  true,
  `expected projectedLiquidCents token in output, got: ${failingOutput}`
);
assert.equal(
  failingOutput.includes(path.normalize(path.join('app', 'consumer', 'page.tsx'))),
  true,
  `expected bad fixture path in output, got: ${failingOutput}`
);

const passing = runFixture('allowlisted');
const passingOutput = `${passing.stdout ?? ''}${passing.stderr ?? ''}`;
assert.equal(
  passing.status,
  0,
  `expected allowlisted projected-liquid-cents fixture to pass, got status=${passing.status ?? 'null'}`
);
assert.equal(
  passingOutput.includes('check:projected-liquid-cents: ok'),
  true,
  `expected success output, got: ${passingOutput}`
);

process.stdout.write('projected-liquid-cents: ok\n');
