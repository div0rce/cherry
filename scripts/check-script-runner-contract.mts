import fs from 'node:fs';
import path from 'node:path';
import { ensureTsEsm } from './lib/ensure-ts-esm.mjs';
import { asMessage } from './guardrails/lib/error.mjs';
import { fail } from './guardrails/lib/fail.mjs';
import { PackageJsonSchema, readJsonFile } from './guardrails/lib/read-json.mjs';

ensureTsEsm();

const PREFIX = 'check:script-runner-contract';
const ROOT_ENV = process.env['CHERRY_SCRIPT_RUNNER_CONTRACT_ROOT'];
const ROOT = ROOT_ENV !== undefined && ROOT_ENV !== '' ? path.resolve(ROOT_ENV) : process.cwd();
const PACKAGE_JSON = path.join(ROOT, 'package.json');
const FIX = 'Run scripts via npm run ts:esm -- <script> (tsx wrapper).';
const SCRIPT_PATH_PATTERN = /(^|[^A-Za-z0-9_])scripts[\\/]/;
const DIRECT_RUNNER_PATTERN = /\b(tsx|ts-node|node)\b/;
const WRAPPER_PATTERN = /\bnpm\s+run\s+ts:esm\b/;
const ALLOWED_RUNNERS = new Set(['ts:esm']);

type Violation = {
  script: string;
  command: string;
  issue: string;
};

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

function main(): void {
  const scripts = readScripts();
  const violations: Violation[] = [];

  for (const [name, command] of Object.entries(scripts)) {
    if (typeof command !== 'string' || command.trim().length === 0) continue;
    if (ALLOWED_RUNNERS.has(name)) continue;

    const hasScriptPath = SCRIPT_PATH_PATTERN.test(command);
    if (!hasScriptPath) {
      if (DIRECT_RUNNER_PATTERN.test(command)) {
        violations.push({
          script: name,
          command,
          issue: 'direct tsx/ts-node/node usage in script command',
        });
      }
      continue;
    }

    if (!WRAPPER_PATTERN.test(command)) {
      violations.push({
        script: name,
        command,
        issue: 'scripts must run via npm run ts:esm wrapper',
      });
      continue;
    }

    if (DIRECT_RUNNER_PATTERN.test(command)) {
      violations.push({
        script: name,
        command,
        issue: 'direct tsx/ts-node/node usage alongside scripts path',
      });
    }
  }

  if (violations.length > 0) {
    const details = violations.map(
      (violation) => `script=${violation.script} issue=${violation.issue} command=${violation.command}`
    );
    fail(PREFIX, 'Script runner contract violations detected', { details, fix: FIX });
  }

  process.stdout.write('script-runner-contract: ok\n');
}

try {
  main();
} catch (error: unknown) {
  const message = asMessage(error);
  fail(PREFIX, `Guardrail crashed: ${message}`, { fix: FIX });
}
