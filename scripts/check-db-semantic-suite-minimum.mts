import fs from 'node:fs';
import path from 'node:path';
import { ensureTsEsm } from './lib/ensure-ts-esm.mjs';
import { fail } from './guardrails/lib/fail.mjs';

ensureTsEsm();

const PREFIX = 'check:db-semantic-suite-minimum';
const FIX = 'Restore the required DB semantic tests under tests/db/semantics.';
const ROOT = process.cwd();

const REQUIRED = [
  'tests/db/semantics/idempotency-no-double-apply.test.ts',
  'tests/db/semantics/atomicity-no-partial-writes.test.ts',
  'tests/db/semantics/ledger-conservation.test.ts',
  'tests/db/semantics/ledger-cross-row-conservation.test.ts',
  'tests/db/semantics/status-causality.test.ts',
  'tests/db/semantics/ledger-semantic-uniqueness.test.ts',
  'tests/db/semantics/temporal-immutability.test.ts',
] as const;

function main(): void {
  const missing = REQUIRED.filter((file) => fs.existsSync(path.join(ROOT, file)) === false);
  if (missing.length > 0) {
    fail(PREFIX, 'Missing required DB semantic tests', { details: missing, fix: FIX });
  }
  process.stdout.write('check:db-semantic-suite-minimum: ok\n');
}

main();
