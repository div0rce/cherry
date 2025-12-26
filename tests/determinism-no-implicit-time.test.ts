import { spawnSync } from 'node:child_process';
import path from 'node:path';

const repoRoot = path.resolve(__dirname, '..');

const result = spawnSync(
  process.execPath,
  [
    '-r',
    'ts-node/register',
    '-r',
    'tsconfig-paths/register',
    'scripts/check-no-implicit-time.mts',
  ],
  {
    cwd: repoRoot,
    stdio: 'inherit',
    env: {
      ...process.env,
      TS_NODE_PROJECT: 'tsconfig.scripts.json',
    },
  }
);

if (result.status !== 0) {
  throw new Error('check-no-implicit-time failed');
}
