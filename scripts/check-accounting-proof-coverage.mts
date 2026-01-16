import { ensureTsEsm } from './lib/ensure-ts-esm.mjs';
import { fail } from './guardrails/lib/fail.mjs';
import { importUnknown } from './guardrails/lib/import-typed.mjs';

ensureTsEsm();

const PREFIX = 'check:accounting-proof-coverage';
const ROOT = process.cwd();

type ModuleShape = {
  runAccountingProofCoverage?: () => void;
};

async function main(): Promise<void> {
  const targetPath = `${ROOT}/scripts/guardrails/accounting-proof-coverage.mts`;
  const mod = (await importUnknown(targetPath)) as ModuleShape;
  if (typeof mod.runAccountingProofCoverage !== 'function') {
    fail(PREFIX, 'Accounting proof coverage guardrail missing entrypoint', {
      fix: 'Export runAccountingProofCoverage from scripts/guardrails/accounting-proof-coverage.mts.',
    });
  }
  mod.runAccountingProofCoverage();
}

void main();
