import * as path from 'node:path';
import * as process from 'node:process';
import { fileURLToPath } from 'node:url';
import fg from 'fast-glob';
import { buildDeterministicEnv } from './lib/deterministic-env.mjs';
import { ensureTsEsm } from './lib/ensure-ts-esm.mjs';
import { fail } from './guardrails/lib/fail.mjs';
import { runTsEsm } from './lib/run-ts-esm.mjs';

ensureTsEsm();

const PREFIX = 'check:run-tests:next';
const FIX = 'Run Next tests via npm run check:run-tests:next after installing dependencies.';

const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), '..');

const baseEnv = buildDeterministicEnv();
const nodeEnv = baseEnv['NODE_ENV'] ?? 'test';
const runEnv: NodeJS.ProcessEnv = { ...baseEnv, NODE_ENV: nodeEnv };

const testFiles = fg
  .sync(['tests/next/**/*.test.{js,ts,tsx}'], {
    cwd: repoRoot,
    absolute: true,
    ignore: ['**/__mocks__/**', 'tests/fixtures/**', 'tests/db/**'],
  })
  .sort();

if (testFiles.length === 0) {
  fail(PREFIX, 'No Next tests found under tests/next/**/*.test.{js,ts,tsx}', { fix: FIX });
}

for (const file of testFiles) {
  process.stdout.write(`RUN ${path.relative(repoRoot, file)}\n`);
  const result = runTsEsm(
    file,
    [
      '--import',
      './scripts/lib/loaders/config.loader.mjs',
      '--import',
      './scripts/lib/loaders/prisma-mock.register.mjs',
      '-r',
      'tsconfig-paths/register',
    ],
    runEnv
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
    fail(PREFIX, `FAILED ${relPath}`, { details, fix: 'Fix the failing test(s) and rerun.' });
  }
}
