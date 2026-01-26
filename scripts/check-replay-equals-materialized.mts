import * as path from 'node:path';
import { buildDeterministicEnv } from './lib/deterministic-env.mjs';
import { ensureTsEsm } from './lib/ensure-ts-esm.mjs';
import { fail } from './guardrails/lib/fail.mjs';
import { runTsEsm } from './lib/run-ts-esm.mjs';

ensureTsEsm();

const PREFIX = 'check:replay-equals-materialized';
const ROOT = process.cwd();
const TEST_FILE = path.join('tests', 'node', 'accounting', 'replay-equals-materialized.spec.ts');
const FIX = 'Run npm run check:replay-equals-materialized after installing dependencies.';

// A5/A9: enforce replay equality with materialized state.
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
    fail(PREFIX, 'Replay != materialized', { details, fix: FIX });
  }

  process.stdout.write('check:replay-equals-materialized: ok\n');
}

runTest();
