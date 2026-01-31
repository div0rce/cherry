import * as fs from 'node:fs';
import * as path from 'node:path';
import { fail } from '../../guardrails/lib/fail.mjs';

export const TMP_BUCKETS = ['npm', 'next', 'prisma', 'guardrails'] as const;
export type TempBucket = (typeof TMP_BUCKETS)[number];

const PREFIX = 'tmp-root';
const FIX = 'Set CHERRY_TMP_ROOT to a writable, private directory (e.g. "$HOME/.cherry-tmp").';
const FORBIDDEN_PREFIXES = [
  path.join(path.sep, 'var', 'folders'),
  path.join(path.sep, 'private', 'var'),
  path.join(path.sep, 'tmp'),
];

function parseTmpRoot(): string {
  const raw = process.env['CHERRY_TMP_ROOT'];
  if (raw === undefined || raw.trim().length === 0) {
    fail(PREFIX, 'CHERRY_TMP_ROOT is required for temp isolation', { fix: FIX });
  }
  const resolved = path.resolve(raw);
  for (const prefix of FORBIDDEN_PREFIXES) {
    if (resolved === prefix || resolved.startsWith(`${prefix}${path.sep}`)) {
      fail(PREFIX, `CHERRY_TMP_ROOT must not point to OS temp (${prefix})`, { fix: FIX });
    }
  }
  return resolved;
}

function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true, mode: 0o700 });
  }
  const stat = fs.statSync(dirPath);
  if (!stat.isDirectory()) {
    fail(PREFIX, `CHERRY_TMP_ROOT must be a directory: ${dirPath}`, { fix: FIX });
  }
  try {
    fs.chmodSync(dirPath, 0o700);
  } catch {
    // Best effort; permissions can be constrained.
  }
}

export function resolveTmpRoot(): string {
  const resolved = parseTmpRoot();
  ensureDir(resolved);
  const guardrailsRoot = path.join(resolved, 'guardrails');
  ensureDir(guardrailsRoot);
  process.env['TMPDIR'] = guardrailsRoot;
  return resolved;
}

export function resolveTmpRootReadOnly(): string {
  const resolved = parseTmpRoot();
  if (!fs.existsSync(resolved)) {
    fail(PREFIX, `CHERRY_TMP_ROOT does not exist: ${resolved}`, { fix: FIX });
  }
  const stat = fs.statSync(resolved);
  if (!stat.isDirectory()) {
    fail(PREFIX, `CHERRY_TMP_ROOT must be a directory: ${resolved}`, { fix: FIX });
  }
  process.env['TMPDIR'] = path.join(resolved, 'guardrails');
  return resolved;
}

export type TempAllocation = {
  bucket: TempBucket;
  root: string;
  path: string;
};

export function allocateTempDir(params: { bucket: TempBucket; subpath: string }): TempAllocation {
  const root = resolveTmpRoot();
  const bucketRoot = path.join(root, params.bucket);
  ensureDir(bucketRoot);
  process.env['TMPDIR'] = bucketRoot;
  const targetPath = path.join(bucketRoot, params.subpath);
  ensureDir(targetPath);
  return { bucket: params.bucket, root, path: targetPath };
}
