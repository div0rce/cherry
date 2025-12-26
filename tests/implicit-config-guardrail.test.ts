import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const repoRoot = path.resolve(__dirname, '..');
const tempDir = path.join(repoRoot, 'lib', '__config_violation');
const tempFile = path.join(tempDir, 'bad-config.ts');

fs.mkdirSync(tempDir, { recursive: true });
fs.writeFileSync(tempFile, 'export const val = process.env.SECRET;\n');

const result = spawnSync(
  process.execPath,
  ['-r', 'ts-node/register', '-r', 'tsconfig-paths/register', 'scripts/check-no-implicit-config.mts'],
  {
    cwd: repoRoot,
    stdio: 'ignore',
    env: {
      ...process.env,
      TS_NODE_PROJECT: 'tsconfig.scripts.json',
    },
  }
);

fs.rmSync(tempDir, { recursive: true, force: true });

if (result.status === 0) {
  throw new Error('check-no-implicit-config should fail on implicit config constructs');
}

process.stdout.write('implicit-config-guardrail: ok\n');
