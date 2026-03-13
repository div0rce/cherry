import * as fs from 'node:fs';
import * as path from 'node:path';
import { ensureTsEsm } from './lib/ensure-ts-esm.mjs';
import { fail } from './guardrails/lib/fail.mjs';

ensureTsEsm();

const PREFIX = 'check:env-contract';
const FIX = 'Set required env vars and ensure .env.example documents them.';
const REQUIRED_ENV = ['CHERRY_TMP_ROOT'] as const;
const DOCUMENTED_ENV = [
  'CHERRY_TMP_ROOT',
  'DATABASE_URL',
  'APP_BASE_URL',
  'NEXTAUTH_URL',
  'EMAIL_SERVER',
  'EMAIL_FROM',
  'NEXT_PUBLIC_SITE_URL',
  'NEXT_PUBLIC_BASE_URL',
  'NEXT_PUBLIC_VERCEL_URL',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'ENABLE_DEV_TOOLS',
  'CHERRY_VINE_SIGNATURE_MODE',
  'CHERRY_OFFLINE_EVALUATOR_ENABLED',
  'CHERRY_DAILYSTATE_CRON_ENABLED',
  'AUTOPILOT_COMMIT_V2',
  'BANK_INGEST_USER_ID',
  'BANK_INGEST_USER_EMAIL',
  'CHERRY_WALLET_PASS_ENABLED',
  'APPLE_WALLET_TEAM_ID',
  'APPLE_WALLET_PASS_TYPE_ID',
  'APPLE_WALLET_ORG_NAME',
  'APPLE_WALLET_PASS_DESCRIPTION',
  'APPLE_WALLET_CERT_PASSWORD',
  'APPLE_WALLET_CERT_PATH',
  'APPLE_WALLET_WWDR_CERT_PATH',
] as const;
const ENV_EXAMPLE = path.join(process.cwd(), '.env.example');

function parseEnvExample(text: string): Map<string, string> {
  const values = new Map<string, string>();
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line.length === 0 || line.startsWith('#')) continue;
    const equalsIndex = line.indexOf('=');
    if (equalsIndex === -1) continue;
    const key = line.slice(0, equalsIndex).trim();
    const value = line.slice(equalsIndex + 1).trim();
    if (key.length === 0) continue;
    values.set(key, value);
  }
  return values;
}

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
const envExampleValues = parseEnvExample(envExampleText);
for (const key of DOCUMENTED_ENV) {
  const value = envExampleValues.get(key);
  if (value === undefined) {
    guardrailFail(`.env.example missing ${key}`, [key]);
  }
  if (value !== '') {
    guardrailFail(`.env.example must not assign a default value for ${key}`, [key]);
  }
}

process.stdout.write('check:env-contract: ok\n');
