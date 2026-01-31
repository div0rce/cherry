import * as fs from 'node:fs';
import * as path from 'node:path';
import { fail } from '../guardrails/lib/fail.mjs';

const PREFIX = 'tmp-root';
const FIX = 'Set CHERRY_TMP_ROOT to a writable, private directory (e.g. "$HOME/.cherry-tmp").';
const FORBIDDEN_PREFIXES = [
  path.join(path.sep, 'var', 'folders'),
  path.join(path.sep, 'private', 'var'),
  path.join(path.sep, 'tmp'),
];

export function resolveTmpRoot(): string {
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

  if (!fs.existsSync(resolved)) {
    fs.mkdirSync(resolved, { recursive: true, mode: 0o700 });
  }
  const stat = fs.statSync(resolved);
  if (!stat.isDirectory()) {
    fail(PREFIX, 'CHERRY_TMP_ROOT must be a directory', { fix: FIX });
  }
  try {
    fs.chmodSync(resolved, 0o700);
  } catch (error: unknown) {
    void error;
  }
  process.env['TMPDIR'] = resolved;
  return resolved;
}
