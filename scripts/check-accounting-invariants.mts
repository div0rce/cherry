import * as path from 'node:path';
import { buildDeterministicEnv } from './lib/deterministic-env.mjs';
import { ensureTsEsm } from './lib/ensure-ts-esm.mjs';
import { fail } from './guardrails/lib/fail.mjs';
import { runTsEsm } from './lib/run-ts-esm.mjs';

ensureTsEsm();

const PREFIX = 'check:accounting-invariants';
const ROOT = process.cwd();
const TEST_FILE = path.join('tests', 'node', 'accounting', 'property.spec.ts');
const FIX = 'Run npm run check:accounting-invariants after installing dependencies.';

// A1/A2/A3/A4/A5/A6/A8/A9: enforce property-based accounting invariants.
function runTest(): void {
  const result = runTsEsm(
    TEST_FILE,
    [
      '--import',
      './scripts/lib/loaders/config.loader.mjs',
      '--import',
      './scripts/lib/loaders/prisma-mock.register.mjs',
      '-r',
      'tsconfig-paths/register',
    ],
    buildDeterministicEnv()
  );

  if (result.exitCode !== 0) {
    const details: string[] = [`exit=${result.exitCode}`];
    if (result.stdout.trim().length > 0) {
      details.push(`stdout=${result.stdout.trim()}`);
    }
    if (result.stderr.trim().length > 0) {
      details.push(`stderr=${result.stderr.trim()}`);
    }
    fail(PREFIX, 'Accounting invariants failed', { details, fix: FIX });
  }

  process.stdout.write('check:accounting-invariants: ok\n');
}

runTest();
