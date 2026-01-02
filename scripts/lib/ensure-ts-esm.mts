import { fail } from '../guardrails/lib/fail.mts';

const PREFIX = 'ensure-ts-esm';
const FIX = 'Execute via npm run ts:esm -- <script>.';

export function ensureTsEsm(): void {
  if (process.env['CHERRY_TSESM'] !== '1') {
    fail(PREFIX, 'This script must be executed via npm run ts:esm', { fix: FIX });
  }
}
