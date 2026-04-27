import * as path from 'node:path';
import { ensureTsEsm } from './lib/ensure-ts-esm.mjs';
import { fail } from './guardrails/lib/fail.mjs';
import { readJsonFile } from './guardrails/lib/read-json.mjs';

ensureTsEsm();

const PREFIX = 'check:package-manager-pin';
const FIX = 'Add an exact npm packageManager version to package.json (e.g. "npm@11.12.1").';

function guardrailFail(message: string, details: string[] = []): never {
  fail(PREFIX, message, { details, fix: FIX });
}

const packageJsonPath = path.join(process.cwd(), 'package.json');
const parsed = readJsonFile(packageJsonPath) as { packageManager?: unknown };
const manager = parsed.packageManager;
if (typeof manager !== 'string' || manager.trim().length === 0) {
  guardrailFail('packageManager is required in package.json');
}

const normalized = manager.trim();
if (!/^npm@\d+\.\d+\.\d+$/.test(normalized)) {
  guardrailFail('packageManager must be an exact npm version', [normalized]);
}

process.stdout.write('check:package-manager-pin: ok\n');
