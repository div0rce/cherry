import { ensureTsEsm } from './lib/ensure-ts-esm.mjs';
import { fail } from './guardrails/lib/fail.mjs';
import { runTool } from './guardrails/lib/run-tool.mjs';

ensureTsEsm();

const PREFIX = 'check:no-local-env-files';
const FIX = 'Remove env files from git index and keep only .env.example tracked.';
const TARGETS = [
  '.env',
  '.env.local',
  '.env.development',
  '.env.production',
  '.env.test',
  '.env.development.local',
  '.env.production.local',
  '.env.test.local',
] as const;

function guardrailFail(details: string[]): never {
  fail(PREFIX, 'Local env files must not be tracked', { details, fix: FIX });
}

const result = runTool('git', ['ls-files', '-z', '--', ...TARGETS]);
if (result.exitCode !== 0) {
  guardrailFail([`git ls-files failed: ${result.stderr.trim()}`]);
}

const tracked = result.stdout.split('\0').filter((entry) => entry.length > 0);
if (tracked.length > 0) {
  guardrailFail(tracked.map((file) => `tracked=${file}`));
}

process.stdout.write('check:no-local-env-files: ok\n');
