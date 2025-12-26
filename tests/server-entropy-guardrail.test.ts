import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const repoRoot = path.resolve(__dirname, '..');
const tempFile = path.join(repoRoot, 'lib', '__entropy_violation_test.ts');

try {
  fs.writeFileSync(tempFile, 'export const bad = Date.now();\n');
  const result = spawnSync(
    process.execPath,
    ['-r', 'ts-node/register', '-r', 'tsconfig-paths/register', 'scripts/check-no-server-entropy.mts'],
    {
      cwd: repoRoot,
      stdio: 'ignore',
      env: {
        ...process.env,
        TS_NODE_PROJECT: 'tsconfig.scripts.json',
      },
    }
  );

  if (result.status === 0) {
    throw new Error('check-no-server-entropy should fail on forbidden usage');
  }

  process.stdout.write('server-entropy-guardrail: ok\n');
} finally {
  if (fs.existsSync(tempFile)) {
    fs.unlinkSync(tempFile);
  }
}
