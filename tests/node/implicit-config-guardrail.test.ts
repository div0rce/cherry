import * as fs from 'node:fs';
import * as path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const repoRoot = path.resolve(__dirname, '..', '..');
const tempDir = path.join(repoRoot, 'lib', '__config_violation');
const tempFile = path.join(tempDir, 'bad-config.ts');

fs.mkdirSync(tempDir, { recursive: true });
fs.writeFileSync(tempFile, 'export const val = process.env.SECRET;\n');

const result = spawnSync(
  'npm',
  ['run', 'ts:esm', '--', '-r', 'tsconfig-paths/register', 'scripts/check-config.mts'],
  {
    cwd: repoRoot,
    stdio: 'ignore',
  }
);

fs.rmSync(tempDir, { recursive: true, force: true });

if (result.status === 0) {
  throw new Error('check-config should fail on implicit config constructs');
}

process.stdout.write('implicit-config-guardrail: ok\n');
