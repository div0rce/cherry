import * as fs from 'node:fs';
import { ensureTsEsm } from './lib/ensure-ts-esm.mjs';
import { fail } from './guardrails/lib/fail.mjs';
import { TMP_BUCKETS } from './lib/tmp/allocate.mjs';
import { resolveTmpRootReadOnly } from './lib/tmp-root.mjs';

ensureTsEsm();

const PREFIX = 'check:tmp-root-shape';
const FIX =
  'Remove unexpected entries under CHERRY_TMP_ROOT and keep only the allowed bucket directories.';

function sortNames(names: string[]): string[] {
  return names.slice().sort((a, b) => {
    if (a < b) return -1;
    if (a > b) return 1;
    return 0;
  });
}

function main(): void {
  const root = resolveTmpRootReadOnly();
  const allowed = new Set<string>(TMP_BUCKETS);
  const entries = fs.readdirSync(root, { withFileTypes: true });
  const unknown: string[] = [];
  const files: string[] = [];
  const symlinks: string[] = [];
  const others: string[] = [];

  for (const entry of entries) {
    if (entry.isSymbolicLink()) {
      symlinks.push(entry.name);
      continue;
    }
    if (entry.isDirectory()) {
      if (!allowed.has(entry.name)) {
        unknown.push(entry.name);
      }
      continue;
    }
    if (entry.isFile()) {
      files.push(entry.name);
      continue;
    }
    others.push(entry.name);
  }

  const details: string[] = [];
  if (unknown.length > 0) {
    for (const name of sortNames(unknown)) {
      details.push(`unknownDir=${name}`);
    }
  }
  if (files.length > 0) {
    for (const name of sortNames(files)) {
      details.push(`unexpectedFile=${name}`);
    }
  }
  if (symlinks.length > 0) {
    for (const name of sortNames(symlinks)) {
      details.push(`symlink=${name}`);
    }
  }
  if (others.length > 0) {
    for (const name of sortNames(others)) {
      details.push(`unexpectedEntry=${name}`);
    }
  }

  if (details.length > 0) {
    fail(PREFIX, `CHERRY_TMP_ROOT must contain only ${TMP_BUCKETS.join(', ')} directories`, {
      details,
      fix: FIX,
    });
  }

  process.stdout.write('check:tmp-root-shape: ok\n');
}

main();
