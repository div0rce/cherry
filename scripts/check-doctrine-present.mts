import * as fs from 'node:fs';
import * as path from 'node:path';
import { ensureTsEsm } from './lib/ensure-ts-esm.mjs';
import { fail } from './guardrails/lib/fail.mjs';

ensureTsEsm();

const ROOT = process.cwd();
const PREFIX = 'check:doctrine-present';
const DOCTRINE_PATH = path.join(ROOT, 'docs', 'doctrine.md');
const FIX = 'Create docs/doctrine.md with a Version: doctrine_* header and Exit criteria block.';

function guardrailFail(message: string): never {
  fail(PREFIX, message, { fix: FIX });
}

if (!fs.existsSync(DOCTRINE_PATH)) {
  guardrailFail(`Missing doctrine file at ${DOCTRINE_PATH}`);
}

const content = fs.readFileSync(DOCTRINE_PATH, 'utf8');

if (!content.includes('Version: doctrine_')) {
  guardrailFail('Doctrine file must include Version: doctrine_');
}

if (!content.includes('Exit criteria')) {
  guardrailFail('Doctrine file must include an Exit criteria block');
}

process.stdout.write('check-doctrine-present: ok\n');
