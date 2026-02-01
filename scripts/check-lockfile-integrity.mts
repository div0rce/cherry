import * as path from 'node:path';
import { ensureTsEsm } from './lib/ensure-ts-esm.mjs';
import { fail } from './guardrails/lib/fail.mjs';
import { readJsonFile } from './guardrails/lib/read-json.mjs';

ensureTsEsm();

const PREFIX = 'check:lockfile-integrity';
const FIX = 'Regenerate package-lock.json via npm install or npm ci.';

function guardrailFail(message: string, details: string[] = []): never {
  fail(PREFIX, message, { details, fix: FIX });
}

const root = process.cwd();
const packageJsonPath = path.join(root, 'package.json');
const packageLockPath = path.join(root, 'package-lock.json');

const packageJson = readJsonFile(packageJsonPath) as { name?: unknown };
const packageLock = readJsonFile(packageLockPath) as {
  lockfileVersion?: unknown;
  packages?: Record<string, { name?: unknown }>;
};

if (typeof packageLock.lockfileVersion !== 'number') {
  guardrailFail('package-lock.json missing lockfileVersion');
}

const packages = packageLock.packages;
if (packages === undefined || typeof packages !== 'object') {
  guardrailFail('package-lock.json missing packages entry');
}

const rootPackage = packages[''];
if (!rootPackage || typeof rootPackage !== 'object') {
  guardrailFail('package-lock.json missing root package entry');
}

if (typeof packageJson.name !== 'string' || packageJson.name.length === 0) {
  guardrailFail('package.json missing name');
}

if (rootPackage.name !== packageJson.name) {
  guardrailFail('package-lock root name mismatch', [String(rootPackage.name)]);
}

process.stdout.write('check:lockfile-integrity: ok\n');
