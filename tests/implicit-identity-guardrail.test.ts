import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const repoRoot = path.resolve(__dirname, '..');
const tempDir = path.join(repoRoot, 'lib', '__identity_violation');
const tempFileA = path.join(tempDir, 'bad-random.ts');
const tempFileB = path.join(tempDir, 'bad-hash.ts');

fs.mkdirSync(tempDir, { recursive: true });
fs.writeFileSync(tempFileA, 'export const bad = randomUUID();\n');
fs.writeFileSync(tempFileB, "import { createHash } from 'crypto';\nexport const h = createHash('sha256').update(new Date().toISOString());\n");

const result = spawnSync(
  'npm',
  ['run', 'ts:esm', '--', '-r', 'tsconfig-paths/register', 'scripts/check-no-implicit-identity.mts'],
  {
    cwd: repoRoot,
    stdio: 'ignore',
  }
);

fs.rmSync(tempDir, { recursive: true, force: true });

if (result.status === 0) {
  throw new Error('check-no-implicit-identity should fail on implicit identity constructs');
}

process.stdout.write('implicit-identity-guardrail: ok\n');
