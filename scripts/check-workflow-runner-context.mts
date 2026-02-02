import * as fs from 'node:fs';
import * as path from 'node:path';
import { ensureTsEsm } from './lib/ensure-ts-esm.mjs';
import { fail } from './guardrails/lib/fail.mjs';

ensureTsEsm();

const PREFIX = 'check:workflow-runner-context';
const FIX =
  'Replace runner.* in env blocks with RUNNER_TEMP or move expressions into steps.env.';
const ROOT = process.cwd();
const WORKFLOWS = [
  '.github/workflows/ci.yml',
  '.github/workflows/env-checks.yml',
] as const;

function guardrailFail(details: string[]): never {
  fail(PREFIX, 'runner.* expressions are not allowed outside steps.env', {
    details,
    fix: FIX,
  });
}

const details: string[] = [];

for (const workflow of WORKFLOWS) {
  const absolute = path.join(ROOT, workflow);
  if (!fs.existsSync(absolute)) {
    details.push(`missing=${workflow}`);
    continue;
  }
  const lines = fs.readFileSync(absolute, 'utf8').split('\n');
  let inSteps = false;
  let stepsIndent = -1;
  for (let i = 0; i < lines.length; i += 1) {
    const raw = lines[i] ?? '';
    const line = raw.replace(/\t/g, '  ');
    const match = /^(\s*)steps:\s*$/.exec(line);
    if (match !== null) {
      inSteps = true;
      stepsIndent = match[1]?.length ?? 0;
      continue;
    }
    if (inSteps) {
      const indent = /^\s*/.exec(line)?.[0]?.length ?? 0;
      if (indent <= stepsIndent && line.trim().length > 0) {
        inSteps = false;
        stepsIndent = -1;
      }
    }
    const runnerMatch = /\${{\s*runner\.[^}]+\s*}}/.test(line);
    if (runnerMatch === true) {
      if (inSteps === false) {
        details.push(`${workflow}:${i + 1}: runner.* outside steps`);
      }
    }
  }
}

if (details.length > 0) {
  guardrailFail(details);
}

process.stdout.write('check:workflow-runner-context: ok\n');
