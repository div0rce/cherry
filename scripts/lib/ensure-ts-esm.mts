export function ensureTsEsm(): void {
  if (!process.execArgv.some((arg) => arg.includes('ts-node/esm'))) {
    throw new Error('This script must be executed via npm run ts:esm');
  }
}
