import * as fs from 'node:fs';
import * as path from 'node:path';
import { ensureTsEsm } from './lib/ensure-ts-esm.mjs';
import { fail } from './guardrails/lib/fail.mjs';

ensureTsEsm();

const PREFIX = 'check:ci-uses-npm-ci';
const FIX = 'Update CI workflows to use npm ci for installs.';
const WORKFLOWS = ['.github/workflows/ci.yml', '.github/workflows/env-checks.yml'] as const;

function guardrailFail(message: string, details: string[] = []): never {
  fail(PREFIX, message, { details, fix: FIX });
}

const missing: string[] = [];
const bad: string[] = [];

for (const workflow of WORKFLOWS) {
  const workflowPath = path.join(process.cwd(), workflow);
  if (!fs.existsSync(workflowPath)) {
    missing.push(workflow);
    continue;
  }
  const content = fs.readFileSync(workflowPath, 'utf8');
  if (!content.includes('npm ci')) {
    bad.push(`${workflow}: missing npm ci`);
  }
  if (content.includes('npm install')) {
    bad.push(`${workflow}: uses npm install`);
  }
}

if (missing.length > 0) {
  guardrailFail('Missing CI workflow files', missing);
}

if (bad.length > 0) {
  guardrailFail('CI workflows must use npm ci only', bad);
}

process.stdout.write('check:ci-uses-npm-ci: ok\n');
