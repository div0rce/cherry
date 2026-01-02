#!/usr/bin/env node

import { ensureTsEsm } from './lib/ensure-ts-esm.mjs';
import { fail } from './guardrails/lib/fail.mjs';
import { runTool } from './guardrails/lib/run-tool.mjs';

ensureTsEsm();

const PREFIX = 'check:clean';
const FIX = 'Resolve all untracked, staged, and unstaged changes before running agents or CI.';

const result = runTool('git', ['status', '--porcelain']);
if (result.exitCode !== 0) {
  const details = [`exit=${result.exitCode}`];
  if (result.stdout.trim().length > 0) {
    details.push(`stdout=${result.stdout.trim()}`);
  }
  if (result.stderr.trim().length > 0) {
    details.push(`stderr=${result.stderr.trim()}`);
  }
  fail(PREFIX, 'Failed to run `git status --porcelain`.', {
    details,
    fix: 'Ensure you are inside a git repository and git is on PATH.',
  });
}

const output = result.stdout.trim();
if (output.length > 0) {
  fail(PREFIX, 'Working tree is not clean.', {
    details: ['`git status --porcelain` output:', output],
    fix: FIX,
  });
}
