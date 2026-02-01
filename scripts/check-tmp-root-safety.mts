import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { ensureTsEsm } from './lib/ensure-ts-esm.mjs';
import { fail } from './guardrails/lib/fail.mjs';

ensureTsEsm();

const PREFIX = 'check:tmp-root-safety';
const FIX = 'Set CHERRY_TMP_ROOT to a private, writable directory under $HOME or /tmp.';

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
const allowed = [homeRoot, tmpRoot];
const allowedMatch = allowed.some((base) => resolved === base || resolved.startsWith(`${base}${path.sep}`));
if (!allowedMatch) {
  guardrailFail('CHERRY_TMP_ROOT must be under $HOME or /tmp', [resolved]);
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
