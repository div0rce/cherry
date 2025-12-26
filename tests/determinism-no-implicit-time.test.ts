import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const repoRoot = path.resolve(__dirname, '..');

const result = spawnSync('npm', ['run', 'ts:esm', '--', 'scripts/check-no-implicit-time.mts'], {
  cwd: repoRoot,
  stdio: 'inherit',
});

if (result.status !== 0) {
  throw new Error('check-no-implicit-time failed');
}
