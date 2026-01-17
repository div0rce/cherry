import { buildDeterministicEnv } from './lib/deterministic-env.mjs';
import { ensureTsEsm } from './lib/ensure-ts-esm.mjs';
import { fail } from './guardrails/lib/fail.mjs';
import { runTsEsm } from './lib/run-ts-esm.mjs';

ensureTsEsm();

const PREFIX = 'check:aggregate';
const FIX = 'Run npm run check:aggregate after installing dependencies.';

const args = process.argv.slice(2);
const result = runTsEsm(
  'scripts/guardrails/run.mts',
  ['--aggregate', ...args],
  buildDeterministicEnv()
);

if (result.stdout.length > 0) {
  process.stdout.write(result.stdout);
}
if (result.stderr.length > 0) {
  process.stderr.write(result.stderr);
}

if (result.exitCode !== 0) {
  const details = [`exit=${result.exitCode}`];
  if (result.stdout.trim().length > 0) {
    details.push(`stdout=${result.stdout.trim()}`);
  }
  if (result.stderr.trim().length > 0) {
    details.push(`stderr=${result.stderr.trim()}`);
  }
  fail(PREFIX, 'Aggregate guardrails failed', { details, fix: FIX });
}
