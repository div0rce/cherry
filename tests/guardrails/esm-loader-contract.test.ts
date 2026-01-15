import * as assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), '..', '..');
const entryFile = path.join(repoRoot, 'tests', 'fixtures', 'loader', 'entry.ts');

const result = spawnSync(
  'npm',
  [
    'run',
    'ts:esm',
    '--',
    '--import',
    './scripts/lib/loaders/config.loader.mts',
    '--import',
    './scripts/lib/loaders/prisma-mock.register.mts',
    '-r',
    'tsconfig-paths/register',
    entryFile,
  ],
  {
    cwd: repoRoot,
    encoding: 'utf8',
    env: {
      ...process.env,
      NODE_ENV: 'test',
      CHERRY_TEST_LOADER_SENTINEL: '1',
    },
  }
);

const stdout = result.stdout ?? '';
const stderr = result.stderr ?? '';

assert.equal(
  result.status,
  0,
  `esm loader contract process failed (status=${result.status ?? 'null'})\n${stderr}`
);

assert.ok(
  !stderr.includes('ERR_INVALID_RETURN_PROPERTY_VALUE'),
  `esm loader returned invalid source\n${stderr}`
);
assert.ok(
  !stderr.includes('load" hook but got undefined'),
  `esm loader returned undefined source\n${stderr}`
);
assert.ok(stdout.includes('loader-sentinel-ok'), 'expected sentinel module to load successfully');
