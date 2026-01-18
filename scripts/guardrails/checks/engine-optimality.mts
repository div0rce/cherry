import * as path from 'node:path';
import { buildDeterministicEnv } from '../../lib/deterministic-env.mjs';
import { ensureTsEsm } from '../../lib/ensure-ts-esm.mjs';
import { runTsEsm } from '../../lib/run-ts-esm.mjs';
import { fail } from '../lib/fail.mjs';

ensureTsEsm();

const PREFIX = 'check:engine-optimality';
const ROOT = process.cwd();
const FIX = 'Run npm run check:engine-optimality after installing dependencies.';
const CONFIG_LOADER = path.join(ROOT, 'scripts', 'lib', 'loaders', 'config.loader.mjs');
const PRISMA_MOCK_LOADER = path.join(
  ROOT,
  'scripts',
  'lib',
  'loaders',
  'prisma-mock.register.mjs'
);

const TEST_FILES = [
  path.join('tests', 'engine', 'optimality', 'admissibility-equivalence.spec.ts'),
  path.join('tests', 'engine', 'optimality', 'exhaustive.optimality.spec.ts'),
];

const deterministicEnv = buildDeterministicEnv();

function runTest(testFile: string): void {
  const nodeArgs = [
    '--import',
    CONFIG_LOADER,
    '--import',
    PRISMA_MOCK_LOADER,
    '-r',
    'tsconfig-paths/register',
  ];
  const result = runTsEsm(testFile, nodeArgs, deterministicEnv);

  if (result.stdout.length > 0) {
    process.stdout.write(result.stdout);
  }
  if (result.stderr.length > 0) {
    process.stderr.write(result.stderr);
  }

  if (result.exitCode !== 0) {
    const details: string[] = [`exit=${result.exitCode}`];
    if (result.stdout.trim().length > 0) {
      details.push(`stdout=${result.stdout.trim()}`);
    }
    if (result.stderr.trim().length > 0) {
      details.push(`stderr=${result.stderr.trim()}`);
    }
    fail(PREFIX, `Engine optimality tests failed (${testFile})`, {
      details,
      fix: FIX,
    });
  }
}

for (const testFile of TEST_FILES) {
  runTest(testFile);
}

process.stdout.write('check:engine-optimality: ok\n');
