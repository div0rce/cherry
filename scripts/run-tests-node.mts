import * as path from 'node:path';
import * as process from 'node:process';
import { fileURLToPath } from 'node:url';
import { buildDeterministicEnv } from './lib/deterministic-env.mjs';
import { ensureTsEsm } from './lib/ensure-ts-esm.mjs';
import { fail } from './guardrails/lib/fail.mjs';
import { runTsEsm } from './lib/run-ts-esm.mjs';
import {
  GLOBAL_EXCLUDED,
  NODE_GLOBS,
  resolveFiles,
} from './lib/test-runner-scope.mjs';

ensureTsEsm();

const PREFIX = 'check:run-tests:node';
const FIX = 'Run Node tests via npm run check:run-tests:node after installing dependencies.';

const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), '..');

const baseEnv = buildDeterministicEnv();
const nodeEnv = baseEnv['NODE_ENV'] ?? 'test';
const runEnv: NodeJS.ProcessEnv = { ...baseEnv, NODE_ENV: nodeEnv };

const testFiles = await resolveFiles(NODE_GLOBS, GLOBAL_EXCLUDED, repoRoot);

if (testFiles.length === 0) {
  fail(PREFIX, 'No Node tests found under tests/node/**/*.test.{js,ts,tsx}', { fix: FIX });
}

for (const file of testFiles) {
  process.stdout.write(`RUN ${file}\n`);
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
    if (result.stdout.trim().length > 0) {
      details.push(`stdout=${result.stdout.trim()}`);
    }
    if (result.stderr.trim().length > 0) {
      details.push(`stderr=${result.stderr.trim()}`);
    }
    fail(PREFIX, `FAILED ${file}`, { details, fix: 'Fix the failing test(s) and rerun.' });
  }
}
