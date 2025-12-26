import { spawnSync } from 'node:child_process';
import path from 'node:path';

const repoRoot = path.resolve(__dirname, '..');

const result = spawnSync('npm', ['run', 'ts:esm', '--', 'scripts/check-no-implicit-time.mts'], {
  cwd: repoRoot,
  stdio: 'inherit',
});

if (result.status !== 0) {
  throw new Error('check-no-implicit-time failed');
}
