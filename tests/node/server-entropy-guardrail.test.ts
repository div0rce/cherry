import * as fs from 'node:fs';
import * as path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const repoRoot = path.resolve(__dirname, '..', '..');
const tempFile = path.join(repoRoot, 'lib', '__entropy_violation_test.ts');

try {
  fs.writeFileSync(tempFile, 'export const bad = Date.now();\n');
  const result = spawnSync(
    'npm',
    ['run', 'ts:esm', '--', '-r', 'tsconfig-paths/register', 'scripts/check-server-entropy.mts'],
    {
      cwd: repoRoot,
      stdio: 'ignore',
    }
  );

  if (result.status === 0) {
    throw new Error('check-server-entropy should fail on forbidden usage');
  }

  process.stdout.write('server-entropy-guardrail: ok\n');
} finally {
  if (fs.existsSync(tempFile)) {
    fs.unlinkSync(tempFile);
  }
}
