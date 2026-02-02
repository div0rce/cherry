import * as fs from 'node:fs';
import * as path from 'node:path';
import { ensureTsEsm } from './lib/ensure-ts-esm.mjs';
import { fail } from './guardrails/lib/fail.mjs';

ensureTsEsm();

const PREFIX = 'check:workflow-expressions-quoted';
const FIX = 'Quote RUNNER_TEMP usage, e.g. CHERRY_TMP_ROOT: "${RUNNER_TEMP}/cherry-tmp".';
const ROOT = process.cwd();
const WORKFLOWS = [
  '.github/workflows/ci.yml',
  '.github/workflows/env-checks.yml',
] as const;
const UNQUOTED = /CHERRY_TMP_ROOT:\s*\${\s*RUNNER_TEMP\s*}/;
const QUOTED = /CHERRY_TMP_ROOT:\s*"\${RUNNER_TEMP}\/[^\n"]+"/;

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
  } else if (QUOTED.test(content) === false) {
    details.push(`missingQuoted=${workflow}`);
  }
}

if (details.length > 0) {
  guardrailFail(details);
}

process.stdout.write('check:workflow-expressions-quoted: ok\n');
