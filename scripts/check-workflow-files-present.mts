import { ensureTsEsm } from './lib/ensure-ts-esm.mjs';
import { fail } from './guardrails/lib/fail.mjs';
import { runTool } from './guardrails/lib/run-tool.mjs';

ensureTsEsm();

const PREFIX = 'check:workflow-files-present';
const FIX = 'Add the required workflows to git and commit them.';
const REQUIRED = [
  '.github/workflows/ci.yml',
  '.github/workflows/env-checks.yml',
] as const;

function guardrailFail(details: string[]): never {
  fail(PREFIX, 'Required workflows are missing from git', { details, fix: FIX });
}

const result = runTool('git', ['ls-files', '-z', '--', ...REQUIRED]);
if (result.exitCode !== 0) {
  guardrailFail([`git ls-files failed: ${result.stderr.trim()}`]);
}

const tracked = result.stdout.split('\0').filter((entry) => entry.length > 0);
if (tracked.length !== REQUIRED.length) {
  const missing = REQUIRED.filter((file) => !tracked.includes(file));
  guardrailFail(missing.map((file) => `missing=${file}`));
}

process.stdout.write('check:workflow-files-present: ok\n');
