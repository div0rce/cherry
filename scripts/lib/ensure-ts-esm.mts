export function ensureTsEsm(): void {
  if (process.env['CHERRY_TSESM'] !== '1') {
    throw new Error('This script must be executed via npm run ts:esm');
  }
}
