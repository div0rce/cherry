import { ensureTsEsm } from './lib/ensure-ts-esm.mjs';
import { fail } from './guardrails/lib/fail.mjs';
import { preflightProblems } from './lib/full-gate.mjs';
import { resolveRootArg } from './lib/root-arg.mjs';

ensureTsEsm();

const problems = preflightProblems(resolveRootArg(process.argv));
if (problems.length > 0) {
  fail('verify:preflight', 'environment not ready for npm ci, build, or the FULL gate', {
    details: problems,
    fix: 'Fix each item above, then rerun npm run verify:preflight.',
  });
}
process.stdout.write('verify:preflight: ok\n');
