import * as fs from 'node:fs';
import * as path from 'node:path';
import { ensureTsEsm } from '../lib/ensure-ts-esm.mjs';
import { fail } from '../guardrails/lib/fail.mjs';
import { runTool } from '../guardrails/lib/run-tool.mjs';
import { TMP_BUCKETS } from '../lib/tmp/allocate.mjs';
import { resolveTmpRootReadOnly } from '../lib/tmp-root.mjs';

ensureTsEsm();

const PREFIX = 'tmp:gc';
const DEFAULT_TTL_HOURS = 24;
const TTL_ENV = 'CHERRY_TMP_GC_TTL_HOURS';

function parseTtlMs(): number {
  const raw = process.env[TTL_ENV];
  if (raw === undefined || raw.trim().length === 0) {
    return DEFAULT_TTL_HOURS * 60 * 60 * 1000;
  }
  const hours = Number(raw);
  if (!Number.isFinite(hours) || hours <= 0) {
    fail(PREFIX, `Invalid ${TTL_ENV}`, {
      details: [`value=${raw}`],
      fix: `Set ${TTL_ENV} to a positive number of hours.`,
    });
  }
  return hours * 60 * 60 * 1000;
}

function sortDirents(entries: fs.Dirent[]): fs.Dirent[] {
  return entries.slice().sort((a, b) => {
    if (a.name < b.name) return -1;
    if (a.name > b.name) return 1;
    return 0;
  });
}

function safeReaddir(dir: string): fs.Dirent[] {
  try {
    return fs.readdirSync(dir, { withFileTypes: true });
  } catch (error: unknown) {
    fail(PREFIX, 'Failed to read directory', { details: [dir, String(error)] });
  }
}

function safeStat(filePath: string): fs.Stats {
  try {
    return fs.lstatSync(filePath);
  } catch (error: unknown) {
    fail(PREFIX, 'Failed to stat path', { details: [filePath, String(error)] });
  }
}

function removePath(target: string): void {
  try {
    fs.rmSync(target, { recursive: true, force: true });
  } catch (error: unknown) {
    fail(PREFIX, 'Failed to remove path', { details: [target, String(error)] });
  }
}

function dumpDu(label: string, root: string): void {
  const result = runTool('du', ['-h', root]);
  const lines: string[] = [label];
  if (result.stdout.trim().length > 0) {
    lines.push(result.stdout.trim());
  }
  if (!result.ok && result.stderr.trim().length > 0) {
    lines.push(`du-error=${result.stderr.trim()}`);
  }
  process.stdout.write(`${lines.join('\n')}\n`);
}

function main(): void {
  const root = resolveTmpRootReadOnly();
  const ttlMs = parseTtlMs();
  const nowMs = Date.now();

  dumpDu('tmp:gc before', root);

  const allowed = new Set<string>(TMP_BUCKETS);
  const rootEntries = sortDirents(safeReaddir(root));
  for (const entry of rootEntries) {
    const entryPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      if (!allowed.has(entry.name)) {
        removePath(entryPath);
      }
      continue;
    }
    removePath(entryPath);
  }

  for (const bucket of TMP_BUCKETS) {
    const bucketRoot = path.join(root, bucket);
    if (!fs.existsSync(bucketRoot)) continue;
    const bucketEntries = sortDirents(safeReaddir(bucketRoot));
    for (const entry of bucketEntries) {
      const entryPath = path.join(bucketRoot, entry.name);
      const stat = safeStat(entryPath);
      const ageMs = nowMs - stat.mtimeMs;
      if (ageMs < ttlMs) continue;
      removePath(entryPath);
    }
  }

  dumpDu('tmp:gc after', root);
}

main();
