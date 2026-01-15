import fg from 'fast-glob';
import { ensureTsEsm } from './lib/ensure-ts-esm.mjs';
import { fail } from './guardrails/lib/fail.mjs';

ensureTsEsm();

const PREFIX = 'check:db-accounting-replay';
const ROOT = process.cwd();
const TARGET = path.join(ROOT, 'tests', 'db', 'semantics', 'accounting-replay.test.ts');
const FIX = 'Add or restore tests/db/semantics/accounting-replay.test.ts.';

function main(): void {
  if (!fs.existsSync(TARGET)) {
    fail(PREFIX, 'Accounting replay semantic test missing', { fix: FIX });
  }
  const content = fs.readFileSync(TARGET, 'utf8');
  if (!content.includes('db-semantics-accounting-replay')) {
    fail(PREFIX, 'Accounting replay test marker missing', { fix: FIX });
  }
  process.stdout.write('check:db-accounting-replay: ok\n');
}

main();
