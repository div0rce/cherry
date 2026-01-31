import * as fs from 'node:fs';
import * as path from 'node:path';

export const TMP_BUCKETS = ['npm', 'next', 'prisma', 'guardrails'] as const;
export type TempBucket = (typeof TMP_BUCKETS)[number];

const FORBIDDEN_PREFIXES = [
  path.join(path.sep, 'var', 'folders'),
  path.join(path.sep, 'private', 'var'),
  path.join(path.sep, 'tmp'),
];

function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true, mode: 0o700 });
  }
  const stat = fs.statSync(dirPath);
  if (!stat.isDirectory()) {
    throw new Error(`CHERRY_TMP_ROOT must be a directory: ${dirPath}`);
  }
  try {
    fs.chmodSync(dirPath, 0o700);
  } catch {
    // Best effort; permissions may be constrained in some environments.
  }
}

function sortEntries(entries: fs.Dirent[]): fs.Dirent[] {
  return entries.slice().sort((a, b) => {
    if (a.name < b.name) return -1;
    if (a.name > b.name) return 1;
    return 0;
  });
}

function dirSizeBytes(root: string): number {
  let total = 0;
  const stack = [root];
  while (stack.length > 0) {
    const current = stack.pop();
    if (current === undefined) continue;
    if (!fs.existsSync(current)) continue;
    const stat = fs.lstatSync(current);
    if (stat.isSymbolicLink()) continue;
    if (stat.isFile()) {
      total += stat.size;
      continue;
    }
    if (stat.isDirectory()) {
      const entries = sortEntries(fs.readdirSync(current, { withFileTypes: true }));
      for (let i = entries.length - 1; i >= 0; i -= 1) {
        const entry = entries[i];
        if (entry === undefined) continue;
        stack.push(path.join(current, entry.name));
      }
    }
  }
  return total;
}

export function resolveTmpRoot(): string {
  const raw = process.env['CHERRY_TMP_ROOT'];
  if (raw === undefined || raw.trim().length === 0) {
    throw new Error('CHERRY_TMP_ROOT is required for temp isolation.');
  }
  const resolved = path.resolve(raw);
  for (const prefix of FORBIDDEN_PREFIXES) {
    if (resolved === prefix || resolved.startsWith(`${prefix}${path.sep}`)) {
      throw new Error(`CHERRY_TMP_ROOT must not point to OS temp (${prefix}).`);
    }
  }
  ensureDir(resolved);
  process.env['TMPDIR'] = resolved;
  return resolved;
}

export type TempAllocation = {
  bucket: TempBucket;
  root: string;
  path: string;
  maxBytes?: number;
  expectedBytes?: number;
};

export function allocateTempDir(params: {
  bucket: TempBucket;
  subpath: string;
  maxBytes?: number;
  expectedBytes?: number;
}): TempAllocation {
  const root = resolveTmpRoot();
  const bucketRoot = path.join(root, params.bucket);
  ensureDir(bucketRoot);

  const expectedBytes = params.expectedBytes ?? 0;
  if (params.maxBytes !== undefined) {
    const currentBytes = dirSizeBytes(bucketRoot);
    if (currentBytes + expectedBytes > params.maxBytes) {
      throw new Error(
        `Temp bucket ${params.bucket} exceeds quota: ${currentBytes} + ${expectedBytes} > ${params.maxBytes}`
      );
    }
  }

  const targetPath = path.join(bucketRoot, params.subpath);
  ensureDir(targetPath);

  return {
    bucket: params.bucket,
    root,
    path: targetPath,
    maxBytes: params.maxBytes,
    expectedBytes,
  };
}
