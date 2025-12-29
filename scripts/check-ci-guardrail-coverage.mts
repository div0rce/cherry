import fs from 'node:fs';
import path from 'node:path';
import { ensureTsEsm } from './lib/ensure-ts-esm.mts';
import { GUARDRAILS, GUARDRAIL_ENTRYPOINT } from './guardrails/registry.mts';

ensureTsEsm();

const PREFIX = 'CI_GUARDRAIL_DRIFT';
const FAILURE_MESSAGE = 'CI does not cover all guardrails';
const ROOT = process.cwd();
const WORKFLOWS_DIR = path.join(ROOT, '.github', 'workflows');
const CI_WORKFLOW = path.join(WORKFLOWS_DIR, 'ci.yml');
const CHECK_SCRIPT = 'check';

function fail(): never {
  process.stderr.write(`${PREFIX}: ${FAILURE_MESSAGE}\n`);
  process.exit(1);
}

function readPackageScripts(): Record<string, string> {
  const packagePath = path.join(ROOT, 'package.json');
  if (fs.existsSync(packagePath) === false) {
    fail();
  }
  const raw = fs.readFileSync(packagePath, 'utf8');
  const parsed = JSON.parse(raw) as { scripts?: Record<string, string> };
  const scripts = parsed.scripts;
  if (scripts === undefined) {
    fail();
  }
  return scripts;
}

function parseGuardrailCalls(command: string): string[] {
  const calls: string[] = [];
  const regex = /npm\s+run\s+([^\s&]+)/g;
  for (const match of command.matchAll(regex)) {
    const name = match[1];
    if (typeof name === 'string' && name.length > 0) {
      calls.push(name);
    }
  }
  return calls;
}

function assertCheckCoverage(): void {
  const scripts = readPackageScripts();
  const checkCommand = scripts[CHECK_SCRIPT];
  if (checkCommand === undefined || checkCommand.trim().length === 0) {
    fail();
  }
  if (!checkCommand.includes(`npm run ${GUARDRAIL_ENTRYPOINT}`)) {
    fail();
  }

  const guardrailCommand = scripts[GUARDRAIL_ENTRYPOINT];
  if (guardrailCommand === undefined || guardrailCommand.trim().length === 0) {
    fail();
  }

  const guardrailNames = Object.keys(GUARDRAILS);
  const guardrailSet = new Set(guardrailNames);
  const calls = parseGuardrailCalls(guardrailCommand);
  const missing = guardrailNames.filter((name) => !calls.includes(name));
  if (missing.length > 0) {
    fail();
  }
  const extra = calls.filter((name) => guardrailSet.has(name) === false);
  if (extra.length > 0) {
    fail();
  }
  if (calls.length === guardrailNames.length) {
    const orderMismatch = calls.some((name, idx) => name !== guardrailNames[idx]);
    if (orderMismatch) {
      fail();
    }
  }
}

function lineIsRunCheck(line: string): boolean {
  const trimmed = line.trim();
  if (trimmed.length === 0) return false;
  const directRun = /^-?\s*run:\s*npm\s+run\s+check\s*(#.*)?$/.test(trimmed);
  if (directRun) return true;
  return /^npm\s+run\s+check\s*(#.*)?$/.test(trimmed);
}

function assertCiRunsCheck(): void {
  if (fs.existsSync(CI_WORKFLOW) === false) {
    fail();
  }
  const content = fs.readFileSync(CI_WORKFLOW, 'utf8');
  const lines = content.split(/\r?\n/);
  const hasCheck = lines.some((line) => lineIsRunCheck(line));
  if (!hasCheck) {
    fail();
  }
}

function main(): void {
  assertCheckCoverage();
  assertCiRunsCheck();

  process.stdout.write('ci-guardrail-coverage: ok\n');
}

main();
