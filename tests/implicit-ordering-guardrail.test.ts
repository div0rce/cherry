import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const repoRoot = path.resolve(__dirname, '..');
const tempDir = path.join(repoRoot, 'lib', '__ordering_violation');
const tempFile = path.join(tempDir, 'bad-order.ts');

fs.mkdirSync(tempDir, { recursive: true });
fs.writeFileSync(tempFile, 'export const xs = [3,2,1].sort();\n');

const result = spawnSync(
  process.execPath,
  ['-r', 'ts-node/register', '-r', 'tsconfig-paths/register', 'scripts/check-no-implicit-ordering.mts'],
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
  throw new Error('check-no-implicit-ordering should fail on implicit ordering constructs');
}

process.stdout.write('implicit-ordering-guardrail: ok\n');
