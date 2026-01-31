import * as fs from 'node:fs';
import * as path from 'node:path';
import { ensureTsEsm } from './lib/ensure-ts-esm.mjs';
import { fail } from './guardrails/lib/fail.mjs';
import { resolveTmpRoot } from './lib/tmp-root.mts';

ensureTsEsm();

const PREFIX = 'check:temp-quota';
const FIX = 'Purge temp artifacts under CHERRY_TMP_ROOT or increase disk space.';
const MAX_BYTES = 5 * 1024 * 1024 * 1024;
const STALE_MS = 24 * 60 * 60 * 1000;

function listDirs(root: string): string[] {
  if (!fs.existsSync(root)) return [];
  const entries = fs.readdirSync(root, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(root, entry.name));
}

function dirSizeBytes(dir: string): number {
  let total = 0;
  const stack = [dir];
  while (stack.length > 0) {
    const current = stack.pop();
    if (current === undefined) continue;
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
      } else if (entry.isFile()) {
        total += fs.statSync(fullPath).size;
      }
    }
  }
  return total;
}

function main(): void {
  const root = resolveTmpRoot();
  const now = Date.now();

  for (const dir of listDirs(root)) {
    const base = path.basename(dir);
    if (!base.startsWith('cherry-')) continue;
    const stat = fs.statSync(dir);
    if (now - stat.mtimeMs > STALE_MS) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }

  let totalBytes = 0;
  for (const dir of listDirs(root)) {
    totalBytes += dirSizeBytes(dir);
  }

  if (totalBytes > MAX_BYTES) {
    const totalGb = (totalBytes / (1024 * 1024 * 1024)).toFixed(2);
    fail(PREFIX, 'Temporary storage exceeds quota', {
      details: [`root=${root}`, `totalGb=${totalGb}`, `limitGb=5`],
      fix: FIX,
    });
  }

  process.stdout.write('check:temp-quota: ok\n');
}

main();
