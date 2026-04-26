import * as fs from 'node:fs';
import * as path from 'node:path';
import { ensureTsEsm } from './lib/ensure-ts-esm.mjs';
import { fail } from './guardrails/lib/fail.mjs';

ensureTsEsm();

const PREFIX = 'check:workflow-expressions-quoted';
const FIX = 'Set CI CHERRY_TMP_ROOT to a quoted absolute temp path, e.g. "/tmp/cherry-tmp".';
const ROOT = process.cwd();
const WORKFLOWS = [
  '.github/workflows/ci.yml',
  '.github/workflows/env-checks.yml',
] as const;
const SHELL_STYLE = /CHERRY_TMP_ROOT:\s*"?\$\{RUNNER_TEMP\}\/[^\n"]+"?/;
const RUNNER_CONTEXT = /CHERRY_TMP_ROOT:\s*"?\$\{\{\s*runner\.temp\s*\}\}\/[^\n"]+"?/;
const UNQUOTED = /CHERRY_TMP_ROOT:\s*\/tmp\/[^\n"]+/;
const QUOTED = /CHERRY_TMP_ROOT:\s*"\/tmp\/[^ \n"]+"/;

function guardrailFail(details: string[]): never {
  fail(PREFIX, 'Workflow temp expressions must be quoted', { details, fix: FIX });
}

const details: string[] = [];

for (const workflow of WORKFLOWS) {
  const absolute = path.join(ROOT, workflow);
  if (!fs.existsSync(absolute)) {
    details.push(`missing=${workflow}`);
    continue;
  }
  const content = fs.readFileSync(absolute, 'utf8');
  if (UNQUOTED.test(content) === true) {
    details.push(`unquoted=${workflow}`);
  } else if (SHELL_STYLE.test(content) === true) {
    details.push(`shellStyle=${workflow}`);
  } else if (RUNNER_CONTEXT.test(content) === true) {
    details.push(`runnerContext=${workflow}`);
  } else if (QUOTED.test(content) === false) {
    details.push(`missingQuoted=${workflow}`);
  }
}

if (details.length > 0) {
  guardrailFail(details);
}

process.stdout.write('check:workflow-expressions-quoted: ok\n');
