import * as fs from 'node:fs';
import * as path from 'node:path';
import { ensureTsEsm } from './lib/ensure-ts-esm.mjs';
import { asMessage } from './guardrails/lib/error.mjs';
import { fail } from './guardrails/lib/fail.mjs';
import { PackageJsonSchema, readJsonFile } from './guardrails/lib/read-json.mjs';

ensureTsEsm();

type Violation = {
  script: string;
  command: string;
  issue: string;
};

const PREFIX = 'check:db-runner-exclusivity';
const FIX = 'Run DB checks via scripts/execution/run-db.mts.';
const ROOT = process.cwd();
const PACKAGE_JSON = path.join(ROOT, 'package.json');
const DB_RUNNER_TOKEN = 'scripts/execution/run-db.mts';
const REQUIRED = new Set([
  'check:db:optional',
  'check:db:required',
  'check:db-ready',
  'check:run-db-tests',
]);

function readScripts(): Record<string, string> {
  if (fs.existsSync(PACKAGE_JSON) === false) {
    fail(PREFIX, 'package.json missing', {
      details: [path.normalize(path.relative(ROOT, PACKAGE_JSON))],
      fix: FIX,
    });
  }
  try {
    const parsed = PackageJsonSchema.parse(readJsonFile(PACKAGE_JSON));
    if (parsed.scripts === undefined) {
      fail(PREFIX, 'package.json scripts missing', { fix: FIX });
    }
    return parsed.scripts;
  } catch (error: unknown) {
    const message = asMessage(error);
    fail(PREFIX, `package.json parse failed: ${message}`, { fix: FIX });
  }
}

function normalizeCommand(command: string): string {
  return command.replace(/\\/g, '/');
}

function usesDbRunner(command: string): boolean {
  const normalized = normalizeCommand(command);
  if (normalized.includes(DB_RUNNER_TOKEN)) return true;
  return normalized.includes(`./${DB_RUNNER_TOKEN}`);
}

function main(): void {
  const scripts = readScripts();
  const violations: Violation[] = [];

  for (const name of REQUIRED) {
    const command = scripts[name];
    if (command === undefined || command.trim().length === 0) {
      violations.push({ script: name, command: '', issue: 'missing script' });
      continue;
    }
    if (usesDbRunner(command) === false) {
      violations.push({ script: name, command, issue: 'must use run-db.mts' });
    }
  }

  if (violations.length > 0) {
    const details = violations.map(
      (violation) => `script=${violation.script} issue=${violation.issue} command=${violation.command}`
    );
    fail(PREFIX, 'DB runner exclusivity violations detected', { details, fix: FIX });
  }

  process.stdout.write('check:db-runner-exclusivity: ok\n');
}

try {
  main();
} catch (error: unknown) {
  const message = asMessage(error);
  fail(PREFIX, `Guardrail crashed: ${message}`, { fix: FIX });
}
