import fg from 'fast-glob';
import { ensureTsEsm } from './lib/ensure-ts-esm.mjs';
import { fail } from './guardrails/lib/fail.mjs';

ensureTsEsm();

const PREFIX = 'check:db-accounting-replay';
const ROOT = process.cwd();
const TARGET = 'tests/db/semantics/accounting-replay.test.ts';
const FIX = 'Restore the DB accounting replay test under tests/db/semantics.';

function main(): void {
  const matches = fg.sync(['tests/db/**/*.test.{js,ts,tsx}'], {
    cwd: ROOT,
    absolute: false,
    ignore: ['**/__mocks__/**', 'tests/fixtures/**'],
  });
  if (!matches.includes(TARGET)) {
    fail(PREFIX, 'Accounting replay semantic test missing', { fix: FIX });
  }
  process.stdout.write('check:db-accounting-replay: ok\n');
}

main();
