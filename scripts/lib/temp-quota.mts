import * as fs from 'node:fs';
import * as path from 'node:path';

export function listDirs(root: string): string[] {
  if (!fs.existsSync(root)) return [];
  const entries = fs.readdirSync(root, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(root, entry.name));
}

export function dirSizeBytes(dir: string): number {
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

export function purgeStaleTempDirs(root: string, nowMs: number, staleMs: number): void {
  for (const dir of listDirs(root)) {
    const base = path.basename(dir);
    if (!base.startsWith('cherry-')) continue;
    const stat = fs.statSync(dir);
    if (nowMs - stat.mtimeMs > staleMs) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }
}

export function currentTimeMs(): number {
  return Date.now();
}

export function totalSizeBytes(root: string): number {
  let totalBytes = 0;
  for (const dir of listDirs(root)) {
    totalBytes += dirSizeBytes(dir);
  }
  return totalBytes;
}
