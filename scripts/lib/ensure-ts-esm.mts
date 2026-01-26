import { fail } from '../guardrails/lib/fail.mjs';

const PREFIX = 'ensure-ts-esm';
const FIX = 'Execute via ts:esm (CHERRY_TSESM=1 tsx --tsconfig tsconfig.scripts.json).';

export function ensureTsEsm(): void {
  if (process.env['CHERRY_TSESM'] !== '1') {
    fail(PREFIX, 'This script must be executed via ts:esm', { fix: FIX });
  }
}
