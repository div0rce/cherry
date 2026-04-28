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
  const packageJson = readJsonFile(packageJsonPath) as {
    engines?: { node?: unknown };
    packageManager?: unknown;
  };
  const enginesNode = packageJson.engines?.node;
  if (typeof enginesNode !== 'string' || enginesNode.length === 0) {
    guardrailFail('package.json engines.node is required');
  }

  const versionMatch = /^v(\d+)\.(\d+)\.(\d+)/.exec(process.version);
  const major = versionMatch ? Number(versionMatch[1]) : NaN;
  const minor = versionMatch ? Number(versionMatch[2]) : NaN;
  const patch = versionMatch ? Number(versionMatch[3]) : NaN;
  if (!Number.isFinite(major) || !Number.isFinite(minor) || !Number.isFinite(patch)) {
    guardrailFail('Unable to parse Node version', [process.version]);
  }
  const satisfiesNodeEngine =
    major === 24 && (minor > 14 || (minor === 14 && patch >= 1));
  if (!satisfiesNodeEngine) {
    guardrailFail('Node version must satisfy engines.node >=24.14.1 <25', [process.version]);
  }

  const tmpRoot = process.env['CHERRY_TMP_ROOT'];
  if (tmpRoot === undefined || tmpRoot.trim().length === 0) {
    guardrailFail('CHERRY_TMP_ROOT must be set when VERCEL=1');
  }

  const packageManager = packageJson.packageManager;
  if (typeof packageManager !== 'string' || packageManager.length === 0) {
    guardrailFail('package.json packageManager is required for Vercel parity');
  }
  const npmMatch = /^npm@(.+)$/.exec(packageManager);
  if (npmMatch === null) {
    guardrailFail('package.json packageManager must be npm@<version>', [packageManager]);
  }
  const requiredVersion = npmMatch[1] ?? '';
  const requiredMajor = requiredVersion.split('.')[0] ?? '';
  const userAgent = process.env['npm_config_user_agent'] ?? '';
  if (userAgent.length === 0) {
    guardrailFail('npm_config_user_agent is required when VERCEL=1');
  }
  const exact = `npm/${requiredVersion}`;
  const majorPrefix = requiredMajor.length > 0 ? `npm/${requiredMajor}.` : '';
  if (!userAgent.includes(exact) && (majorPrefix.length === 0 || !userAgent.includes(majorPrefix))) {
    guardrailFail('npm user agent must match packageManager version', [
      `expected=${exact}`,
      `actual=${userAgent}`,
    ]);
  }

  process.stdout.write('check:vercel-parity: ok\n');
}
