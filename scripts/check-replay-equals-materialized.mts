import path from 'node:path';
import { ensureTsEsm } from './lib/ensure-ts-esm.mjs';
import { fail } from './guardrails/lib/fail.mjs';
import { runTool } from './guardrails/lib/run-tool.mjs';

ensureTsEsm();

const PREFIX = 'check:replay-equals-materialized';
const ROOT = process.cwd();
const TEST_FILE = path.join('tests', 'accounting', 'replay-equals-materialized.spec.ts');
const FIX = 'Run npm run check:replay-equals-materialized after installing dependencies.';

function runTest(): void {
  const result = runTool(
    'npm',
    [
      'run',
      'ts:esm',
      '--',
      '--import',
      './scripts/lib/loaders/config.loader.mjs',
      '--import',
      './scripts/lib/loaders/prisma-mock.register.mjs',
      '-r',
      'tsconfig-paths/register',
      TEST_FILE,
    ],
    {
      cwd: ROOT,
      env: { ...process.env },
    }
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
