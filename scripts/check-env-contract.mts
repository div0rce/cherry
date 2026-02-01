import * as fs from 'node:fs';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { ensureTsEsm } from './lib/ensure-ts-esm.mjs';
import { fail } from './guardrails/lib/fail.mjs';

ensureTsEsm();

const PREFIX = 'check:env-contract';
const FIX = 'Set required env vars and ensure .env.example documents them.';
const REQUIRED_ENV = ['CHERRY_TMP_ROOT'] as const;
const ENV_EXAMPLE = path.join(process.cwd(), '.env.example');

function guardrailFail(message: string, details: string[] = []): never {
  fail(PREFIX, message, { details, fix: FIX });
}

for (const key of REQUIRED_ENV) {
  const value = process.env[key];
  if (value === undefined || value.trim().length === 0) {
    guardrailFail(`Missing required env: ${key}`);
  }
}

const tmpRoot = process.env['CHERRY_TMP_ROOT'];
if (tmpRoot !== undefined) {
  if (!path.isAbsolute(tmpRoot)) {
    guardrailFail('CHERRY_TMP_ROOT must be an absolute path', [tmpRoot]);
  }
  const resolved = path.resolve(tmpRoot);
  const repoRoot = path.resolve(process.cwd());
  if (resolved === repoRoot || resolved.startsWith(`${repoRoot}${path.sep}`)) {
    guardrailFail('CHERRY_TMP_ROOT must not be inside the repo', [resolved]);
  }
  try {
    fs.accessSync(resolved, fs.constants.W_OK);
  } catch (error: unknown) {
    void error;
    guardrailFail('CHERRY_TMP_ROOT must be writable', [resolved]);
  }
}

if (!fs.existsSync(ENV_EXAMPLE)) {
  guardrailFail('Missing .env.example', [path.normalize('.env.example')]);
}

const envExampleText = fs.readFileSync(ENV_EXAMPLE, 'utf8');
for (const key of REQUIRED_ENV) {
  if (!envExampleText.includes(`${key}=`)) {
    guardrailFail(`.env.example missing ${key}`, [key]);
  }
}

process.stdout.write('check:env-contract: ok\n');
