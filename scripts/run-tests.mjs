import { spawnSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import fg from 'fast-glob';

const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), '..');

const tsNodeCompilerOptions = JSON.stringify({
  module: 'CommonJS',
  moduleResolution: 'node',
  baseUrl: '.',
  paths: { '@/*': ['./*'] },
  allowJs: true,
  jsx: 'react-jsx',
});

process.env.TS_NODE_PROJECT = path.join(repoRoot, 'tsconfig.scripts.json');
process.env.TS_NODE_COMPILER_OPTIONS = tsNodeCompilerOptions;
process.env.NODE_ENV = process.env.NODE_ENV ?? 'test';

const testFiles = fg
  .sync(['tests/**/*.test.{js,ts,tsx}'], {
    cwd: repoRoot,
    absolute: true,
    ignore: ['**/__mocks__/**', 'tests/fixtures/**'],
  })
  .sort();

if (testFiles.length === 0) {
  process.stderr.write('No tests found under tests/**/*.test.{js,ts,tsx}\n');
  process.exit(1);
}

process.stdout.write(`TS_NODE_COMPILER_OPTIONS=${tsNodeCompilerOptions}\n`);

for (const file of testFiles) {
  process.stdout.write(`RUN ${path.relative(repoRoot, file)}\n`);
  const result = spawnSync(
    'npm',
    [
      'run',
      'ts:esm',
      '--',
      '-r',
      'tsconfig-paths/register',
      '--import',
      './scripts/lib/config-register.mts',
      '--import',
      './scripts/lib/prisma-mock.mts',
      file,
    ],
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
    if (result.error) {
      console.error(result.error);
    }
    console.error(`FAILED ${path.relative(repoRoot, file)} status=${result.status} signal=${result.signal ?? 'none'}`);
    process.exit(result.status ?? 1);
  }
}
