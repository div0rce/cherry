import * as path from 'node:path';
import { ensureTsEsm } from './lib/ensure-ts-esm.mjs';
import { fail } from './guardrails/lib/fail.mjs';
import { readJsonFile } from './guardrails/lib/read-json.mjs';

ensureTsEsm();

const PREFIX = 'check:vercel-parity';
const FIX = 'Align Vercel env with package.json engines and CHERRY_TMP_ROOT requirements.';

function guardrailFail(message: string, details: string[] = []): never {
  fail(PREFIX, message, { details, fix: FIX });
}

const isVercel = process.env['VERCEL'] === '1' || process.env['VERCEL'] === 'true';
if (!isVercel) {
  process.stdout.write('check:vercel-parity: ok (not required)\n');
  process.exitCode = 0;
} else {
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  const packageJson = readJsonFile(packageJsonPath) as { engines?: { node?: unknown } };
  const enginesNode = packageJson.engines?.node;
  if (typeof enginesNode !== 'string' || enginesNode.length === 0) {
    guardrailFail('package.json engines.node is required');
  }

  const versionMatch = /^v(\d+)\./.exec(process.version);
  const major = versionMatch ? Number(versionMatch[1]) : NaN;
  if (!Number.isFinite(major)) {
    guardrailFail('Unable to parse Node version', [process.version]);
  }
  if (!(major >= 22 && major < 23)) {
    guardrailFail('Node version must satisfy engines.node >=22 <23', [process.version]);
  }

  const tmpRoot = process.env['CHERRY_TMP_ROOT'];
  if (tmpRoot === undefined || tmpRoot.trim().length === 0) {
    guardrailFail('CHERRY_TMP_ROOT must be set when VERCEL=1');
  }

  process.stdout.write('check:vercel-parity: ok\n');
}
