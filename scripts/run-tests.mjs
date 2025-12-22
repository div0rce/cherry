import { spawnSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import fg from 'fast-glob';

const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), '..');

const testFiles = fg
  .sync(['tests/**/*.test.{js,ts,tsx}'], {
    cwd: repoRoot,
    absolute: true,
    ignore: ['**/__mocks__/**'],
  })
  .sort();

if (testFiles.length === 0) {
  process.stderr.write('No tests found under tests/**/*.test.{js,ts,tsx}\n');
  process.exit(1);
}

const tsNodeCompilerOptions = JSON.stringify({
  module: 'CommonJS',
  moduleResolution: 'node',
  baseUrl: '.',
  paths: { '@/*': ['./*'] },
  allowJs: true,
  jsx: 'react-jsx',
});

for (const file of testFiles) {
  const result = spawnSync(
    'node',
    ['-r', 'ts-node/register/transpile-only', '-r', 'tsconfig-paths/register', file],
    {
      cwd: repoRoot,
      stdio: 'inherit',
      env: {
        ...process.env,
        NODE_ENV: 'test',
        TS_NODE_COMPILER_OPTIONS: tsNodeCompilerOptions,
      },
    }
  );

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
