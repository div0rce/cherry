import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { ensureTsEsm } from './lib/ensure-ts-esm.mjs';
import { fail } from './guardrails/lib/fail.mjs';

ensureTsEsm();

const PREFIX = 'check:tmp-root-safety';
const FIX =
  'Set CHERRY_TMP_ROOT to a private, writable directory under $HOME (local) or /tmp (CI/Vercel).';

function guardrailFail(message: string, details: string[] = []): never {
  fail(PREFIX, message, { details, fix: FIX });
}

const rawRoot = process.env['CHERRY_TMP_ROOT'];
if (rawRoot === undefined || rawRoot.trim().length === 0) {
  guardrailFail('CHERRY_TMP_ROOT is required');
}

if (!path.isAbsolute(rawRoot)) {
  guardrailFail('CHERRY_TMP_ROOT must be an absolute path', [rawRoot]);
}

const resolved = path.resolve(rawRoot);
const repoRoot = path.resolve(process.cwd());
if (resolved === repoRoot || resolved.startsWith(`${repoRoot}${path.sep}`)) {
  guardrailFail('CHERRY_TMP_ROOT must not be inside the repo', [resolved]);
}

const homeRoot = path.resolve(os.homedir());
const tmpRoot = path.resolve(path.sep, 'tmp');
const forbiddenRoots = [
  path.resolve(path.sep, 'var', 'folders'),
  path.resolve(path.sep, 'private', 'var', 'folders'),
];
for (const root of forbiddenRoots) {
  if (resolved === root || resolved.startsWith(`${root}${path.sep}`)) {
    guardrailFail('CHERRY_TMP_ROOT must not use macOS temp roots', [resolved]);
  }
}

const isCi = process.env['CI'] === 'true';
const isVercel = process.env['VERCEL'] === '1' || process.env['VERCEL'] === 'true';
const allowTmp = isCi || isVercel;
const isUnderHome = resolved === homeRoot || resolved.startsWith(`${homeRoot}${path.sep}`);
const isUnderTmp = resolved === tmpRoot || resolved.startsWith(`${tmpRoot}${path.sep}`);
if (!isUnderHome && !(allowTmp && isUnderTmp)) {
  guardrailFail('CHERRY_TMP_ROOT must be under $HOME (local) or /tmp (CI/Vercel)', [resolved]);
}

if (!fs.existsSync(resolved)) {
  guardrailFail('CHERRY_TMP_ROOT does not exist', [resolved]);
}

const stat = fs.lstatSync(resolved);
if (stat.isSymbolicLink()) {
  guardrailFail('CHERRY_TMP_ROOT must not be a symlink', [resolved]);
}
if (!stat.isDirectory()) {
  guardrailFail('CHERRY_TMP_ROOT must be a directory', [resolved]);
}

try {
  fs.accessSync(resolved, fs.constants.W_OK);
} catch (error: unknown) {
  void error;
  guardrailFail('CHERRY_TMP_ROOT must be writable', [resolved]);
}

const mode = stat.mode & 0o777;
if ((mode & 0o002) !== 0) {
  guardrailFail('CHERRY_TMP_ROOT must not be world-writable', [resolved]);
}

process.stdout.write('check:tmp-root-safety: ok\n');
