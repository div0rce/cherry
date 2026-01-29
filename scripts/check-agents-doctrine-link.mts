#!/usr/bin/env node

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fail } from './guardrails/lib/fail.mjs';

const ROOT = process.cwd();
const PREFIX = 'check:agents-doctrine-link';
const AGENTS_PATH = path.join(ROOT, 'AGENTS.md');
const FIX = 'Add the doctrine deferral line to AGENTS.md.';

function guardrailFail(message: string, details?: string[]): never {
  fail(PREFIX, message, { details, fix: FIX });
}

function main(): void {
  if (!fs.existsSync(AGENTS_PATH)) {
    guardrailFail('AGENTS.md is missing', [path.relative(ROOT, AGENTS_PATH)]);
  }
  const content = fs.readFileSync(AGENTS_PATH, 'utf8');
  const hasLink = content
    .split(/\r?\n/)
    .some((line) => /defers to docs\/doctrine\.md/.test(line));
  if (!hasLink) {
    guardrailFail('AGENTS.md must defer to docs/doctrine.md', [
      'Expected a line matching /defers to docs\\/doctrine\\.md/',
    ]);
  }
  process.stdout.write('check:agents-doctrine-link: ok\n');
}

main();
