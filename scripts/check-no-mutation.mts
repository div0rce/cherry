import * as path from 'node:path';
import { ensureTsEsm } from './lib/ensure-ts-esm.mjs';
import { fail } from './guardrails/lib/fail.mjs';
import { runTool } from './guardrails/lib/run-tool.mjs';

ensureTsEsm();

const PREFIX = 'check:no-mutation';
const ROOT = process.cwd();
const TEST_FILE = path.join('tests', 'accounting', 'no-mutation.spec.ts');
const FIX = 'Run npm run check:no-mutation after installing dependencies.';

// A4: enforce append-only ledger history.
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
    fail(PREFIX, 'Accounting mutation detected', { details, fix: FIX });
  }

  process.stdout.write('check:no-mutation: ok\n');
}

runTest();
