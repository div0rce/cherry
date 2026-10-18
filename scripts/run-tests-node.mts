import * as path from 'node:path';
import * as process from 'node:process';
import { fileURLToPath } from 'node:url';
import fg from 'fast-glob';
import { buildDeterministicEnv } from './lib/deterministic-env.mjs';
import { ensureTsEsm } from './lib/ensure-ts-esm.mjs';
import { fail } from './guardrails/lib/fail.mjs';
import { runTsEsm } from './lib/run-ts-esm.mjs';

ensureTsEsm();

const PREFIX = 'check:run-tests:node';
const FIX = 'Run Node tests via npm run check:run-tests:node after installing dependencies.';

const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), '..');

const baseEnv = buildDeterministicEnv();
const nodeEnv = baseEnv['NODE_ENV'] ?? 'test';
const runEnv: NodeJS.ProcessEnv = { ...baseEnv, NODE_ENV: nodeEnv };

const testFiles = fg
  .sync(['tests/node/**/*.test.{js,ts,tsx}'], {
    cwd: repoRoot,
    absolute: true,
    ignore: ['**/__mocks__/**', 'tests/fixtures/**', 'tests/db/**'],
  })
  .sort();

// --filter=<glob>[,<glob>] narrows the run (DOMAIN-level verification). Never authoritative:
// the FULL gate is `npm run check && npm test && npm run build`. Commas inside {a,b} stay part
// of the glob, and every --filter= argument counts (npm runs scripts through a shell, which
// brace-expands --filter=a/{b,c} into two arguments).
const filterGlobs = process.argv
  .filter((arg) => arg.startsWith('--filter='))
  .flatMap((arg) => arg.slice('--filter='.length).split(/,(?![^{]*\})/))
  .filter((glob) => glob.length > 0);
const filterArg = filterGlobs.length > 0 ? filterGlobs : undefined;
const filteredFiles =
  filterArg === undefined
    ? testFiles
    : fg
        .sync(filterArg, {
          cwd: repoRoot,
          absolute: true,
          ignore: ['**/__mocks__/**', 'tests/fixtures/**', 'tests/db/**'],
        })
        .filter((file) => testFiles.includes(file))
        .sort();
if (filterArg !== undefined) {
  process.stdout.write(`FILTERED RUN (${filteredFiles.length}/${testFiles.length} files); not a substitute for the full gate\n`);
}

if (filteredFiles.length === 0) {
  fail(PREFIX, 'No Node tests found under tests/node/**/*.test.{js,ts,tsx}', { fix: FIX });
}

for (const file of filteredFiles) {
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
