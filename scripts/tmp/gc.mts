import * as fs from 'node:fs';
import * as path from 'node:path';
import { ensureTsEsm } from '../lib/ensure-ts-esm.mjs';
import { fail } from '../guardrails/lib/fail.mjs';
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

function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'] as const;
  let value = bytes;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  return `${value.toFixed(value < 10 && index > 0 ? 1 : 0)}${units[index]}`;
}

function sizeBytes(target: string): number {
  let total = 0;
  const stack = [target];
  while (stack.length > 0) {
    const current = stack.pop();
    if (current === undefined) continue;
    if (!fs.existsSync(current)) continue;
    const stat = safeStat(current);
    if (stat.isSymbolicLink()) continue;
    if (stat.isFile()) {
      total += stat.size;
      continue;
    }
    if (stat.isDirectory()) {
      const entries = sortDirents(safeReaddir(current));
      for (let i = entries.length - 1; i >= 0; i -= 1) {
        const entry = entries[i];
        if (entry === undefined) continue;
        stack.push(path.join(current, entry.name));
      }
    }
  }
  return total;
}

function dumpSummary(label: string, root: string): void {
  const entries = sortDirents(safeReaddir(root));
  const lines: string[] = [label];
  const totals: Array<{ name: string; size: number }> = [];
  let rootTotal = 0;
  for (const entry of entries) {
    const entryPath = path.join(root, entry.name);
    const size = sizeBytes(entryPath);
    rootTotal += size;
    totals.push({ name: entry.name, size });
  }
  totals.sort((a, b) => {
    if (a.size !== b.size) return b.size - a.size;
    if (a.name < b.name) return -1;
    if (a.name > b.name) return 1;
    return 0;
  });
  for (const entry of totals) {
    lines.push(`${formatBytes(entry.size)}\t${path.join(root, entry.name)}`);
  }
  lines.push(`${formatBytes(rootTotal)}\t${root}`);
  process.stdout.write(`${lines.join('\n')}\n`);
}

function main(): void {
  const root = resolveTmpRootReadOnly();
  const ttlMs = parseTtlMs();
  const nowMs = Date.now();

  dumpSummary('tmp:gc before', root);

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

  dumpSummary('tmp:gc after', root);
}

main();
