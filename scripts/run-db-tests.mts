import * as path from 'node:path';
import * as process from 'node:process';
import { fileURLToPath } from 'node:url';
import fg from 'fast-glob';
import { ensureTsEsm } from './lib/ensure-ts-esm.mjs';
import { fail } from './guardrails/lib/fail.mjs';
import { runTool } from './guardrails/lib/run-tool.mjs';

ensureTsEsm();

const PREFIX = 'check:run-db-tests';
const FIX = 'Run DB tests with DATABASE_URL set (npm run test:db).';

const databaseUrl = process.env['DATABASE_URL'];
if (databaseUrl === undefined || databaseUrl === '') {
  fail(PREFIX, 'DATABASE_URL is missing', { fix: FIX });
}

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

const env = process.env as NodeJS.ProcessEnv;
env['TS_NODE_PROJECT'] = path.join(repoRoot, 'tsconfig.eslint.json');
env['TS_NODE_COMPILER_OPTIONS'] = tsNodeCompilerOptions;
const nodeEnv = env['NODE_ENV'] ?? 'test';

const testFiles = fg
  .sync(['tests/db/**/*.test.{js,ts,tsx}'], {
    cwd: repoRoot,
    absolute: true,
    ignore: ['**/__mocks__/**', 'tests/fixtures/**'],
  })
  .sort();

if (testFiles.length === 0) {
  fail(PREFIX, 'No DB tests found under tests/db/**/*.test.{js,ts,tsx}', { fix: FIX });
}

process.stdout.write(`TS_NODE_COMPILER_OPTIONS=${tsNodeCompilerOptions}\n`);

for (const file of testFiles) {
  process.stdout.write(`RUN ${path.relative(repoRoot, file)}\n`);
  const result = runTool(
    'npm',
    [
      'run',
      'ts:esm',
      '--',
      '--import',
      './scripts/lib/loaders/config.loader.mjs',
      '-r',
      'tsconfig-paths/register',
      file,
    ],
    {
      cwd: repoRoot,
      env: {
        ...process.env,
        NODE_ENV: nodeEnv,
        TS_NODE_COMPILER_OPTIONS: tsNodeCompilerOptions,
      },
    }
  );

  if (result.stdout.length > 0) {
    process.stdout.write(result.stdout);
  }
  if (result.stderr.length > 0) {
    process.stderr.write(result.stderr);
  }

  if (result.exitCode !== 0) {
    const details = [`exit=${result.exitCode}`];
    const relPath = path.relative(repoRoot, file);
    if (result.stdout.trim().length > 0) {
      details.push(`stdout=${result.stdout.trim()}`);
    }
    if (result.stderr.trim().length > 0) {
      details.push(`stderr=${result.stderr.trim()}`);
    }
    fail(PREFIX, `FAILED ${relPath}`, { details, fix: 'Fix the failing DB test(s) and rerun.' });
  }
}
