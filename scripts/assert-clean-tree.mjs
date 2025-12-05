#!/usr/bin/env node

import { execSync } from 'node:child_process';

function main() {
  let output;
  try {
    output = execSync('git status --porcelain', { encoding: 'utf8' }).trim();
  } catch (error) {
    console.error('[check:clean] Failed to run `git status --porcelain`.');
    console.error('[check:clean] Are you inside a git repository?');
    console.error(error?.message ?? String(error));
    process.exit(1);
  }

  if (output.length > 0) {
    console.error('[check:clean] Working tree is not clean.');
    console.error('Resolve all untracked, staged, and unstaged changes before running agents or CI.');
    console.error('`git status --porcelain` output:');
    console.error(output);
    process.exit(1);
  }

  process.exit(0);
}

main();
