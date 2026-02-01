import * as fs from 'node:fs';
import * as path from 'node:path';
import { ensureTsEsm } from './lib/ensure-ts-esm.mjs';
import { fail } from './guardrails/lib/fail.mjs';

ensureTsEsm();

const PREFIX = 'check:guardrail-runner-shape';
const FIX = 'Ensure guardrail execution iterates GUARDRAIL_NAMES exactly once and never executes via selection arrays.';
const ROOT = process.cwd();
const RUNNER_PATH = path.join(ROOT, 'scripts', 'guardrails', 'run.mts');

function guardrailFail(details: string[]): never {
  fail(PREFIX, 'Guardrail runner shape violated', { details, fix: FIX });
}

if (fs.existsSync(RUNNER_PATH) === false) {
  guardrailFail([`missingRunner=${path.relative(ROOT, RUNNER_PATH)}`]);
}

const content = fs.readFileSync(RUNNER_PATH, 'utf8');
const loopMatches = content.match(/for\s*\(\s*const\s+\w+\s+of\s+GUARDRAIL_NAMES\s*\)/g) ?? [];
if (loopMatches.length !== 1) {
  guardrailFail([`guardrailNamesLoops=${loopMatches.length}`]);
}

const forbiddenLoops = [
  /for\s*\(\s*const\s+\w+\s+of\s+selection\.names\s*\)/,
  /for\s*\(\s*const\s+\w+\s+of\s+selectionSet\s*\)/,
  /for\s*\(\s*const\s+\w+\s+of\s+requestedNames\s*\)/,
];
const forbidden = forbiddenLoops.filter((pattern) => pattern.test(content));
if (forbidden.length > 0) {
  guardrailFail(forbidden.map((pattern) => `forbiddenLoop=${pattern}`));
}

process.stdout.write('check:guardrail-runner-shape: ok\n');
