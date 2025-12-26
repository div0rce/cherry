import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const repoRoot = path.resolve(__dirname, '..');
const command = 'grep -R "process.env" lib app | grep -v "/api/"';

const result = spawnSync('bash', ['-lc', command], { cwd: repoRoot, encoding: 'utf8' });

if (result.status === 0) {
  const output =
    typeof result.stdout === 'string' ? result.stdout.trim() : '';
  throw new Error(output === '' ? 'process.env usage detected' : output);
}

if (result.status !== 1) {
  throw result.error ?? new Error(`Unexpected exit status from grep: ${result.status}`);
}

process.stdout.write('no-env-smoke: ok\n');
