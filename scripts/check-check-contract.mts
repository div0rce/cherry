import fs from 'node:fs';
import path from 'node:path';
import { ensureTsEsm } from './lib/ensure-ts-esm.mjs';
import { asMessage } from './guardrails/lib/error.mjs';
import { fail } from './guardrails/lib/fail.mjs';
import { PackageJsonSchema, readJsonFile } from './guardrails/lib/read-json.mjs';

ensureTsEsm();

const PREFIX = 'check:check-contract';
const ROOT_ENV = process.env['CHERRY_CHECK_CONTRACT_ROOT'];
const ROOT = ROOT_ENV !== undefined && ROOT_ENV !== '' ? path.resolve(ROOT_ENV) : process.cwd();
const PACKAGE_JSON = path.join(ROOT, 'package.json');
const FIX = 'Restore CI truth scripts: check, test, build, and ci:verify.';
const REQUIRED_SCRIPTS = ['check', 'test', 'build', 'ci:verify'] as const;
const ENV_SCRIPTS = new Set([
  'check:db',
  'check:db:optional',
  'check:db:required',
  'check:env',
  'check:db-ready',
  'check:migrations:optional',
]);

type ScriptsMap = Record<string, string>;

function readScripts(): ScriptsMap {
  if (fs.existsSync(PACKAGE_JSON) === false) {
    fail(PREFIX, 'package.json missing', {
      details: [path.normalize(path.relative(ROOT, PACKAGE_JSON))],
      fix: FIX,
    });
  }
  try {
    const parsed = PackageJsonSchema.parse(readJsonFile(PACKAGE_JSON));
    if (parsed.scripts === undefined) {
      fail(PREFIX, 'package.json scripts missing', { fix: FIX });
    }
    return parsed.scripts;
  } catch (error: unknown) {
    const message = asMessage(error);
    fail(PREFIX, `package.json parse failed: ${message}`, { fix: FIX });
  }
}

function splitCommands(command: string): string[] {
  return command
    .split('&&')
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0);
}

function matchesRun(script: string, target: string): boolean {
  const regex = new RegExp(`^npm\\s+run\\s+${target}\\s*$`);
  return regex.test(script);
}

function parseRunCalls(command: string): string[] {
  const calls: string[] = [];
  const regex = /npm\s+run\s+([^\s&]+)/g;
  for (const match of command.matchAll(regex)) {
    const name = match[1];
    if (typeof name === 'string' && name.length > 0) {
      calls.push(name);
    }
  }
  return calls;
}

function assertCiVerify(command: string): void {
  const segments = splitCommands(command);
  if (segments.length !== 3) {
    fail(PREFIX, 'ci:verify must run check, test, and build in order', {
      details: [`ci:verify=${command}`],
      fix: 'Set ci:verify to `npm run check && npm run test && npm run build`.',
    });
  }
  const [first, second, third] = segments;
  if (
    first === undefined ||
    second === undefined ||
    third === undefined ||
    !matchesRun(first, 'check') ||
    !matchesRun(second, 'test') ||
    !matchesRun(third, 'build')
  ) {
    fail(PREFIX, 'ci:verify must run check, test, and build in order', {
      details: [`ci:verify=${command}`],
      fix: 'Set ci:verify to `npm run check && npm run test && npm run build`.',
    });
  }
}

function assertCheckIsPure(command: string): void {
  const calls = parseRunCalls(command);
  const hasTest = calls.includes('test');
  const hasBuild = calls.includes('build');
  if (hasTest !== hasBuild) {
    fail(PREFIX, 'check must either include both test+build or neither', {
      details: [`check=${command}`],
      fix: 'Keep check pure or include both test and build.',
    });
  }
  for (const call of calls) {
    if (ENV_SCRIPTS.has(call)) {
      fail(PREFIX, `check must not run env-dependent script ${call}`, {
        details: [`check=${command}`],
        fix: 'Move env checks into check:env.',
      });
    }
  }
}

function main(): void {
  const scripts = readScripts();
  for (const required of REQUIRED_SCRIPTS) {
    if (typeof scripts[required] !== 'string' || scripts[required]?.trim().length === 0) {
      fail(PREFIX, `package.json missing script: ${required}`, { fix: FIX });
    }
  }
  const ciVerify = scripts['ci:verify'];
  if (ciVerify === undefined) {
    fail(PREFIX, 'package.json missing script: ci:verify', { fix: FIX });
  }
  assertCiVerify(ciVerify);

  const checkScript = scripts['check'];
  if (checkScript === undefined) {
    fail(PREFIX, 'package.json missing script: check', { fix: FIX });
  }
  assertCheckIsPure(checkScript);

  process.stdout.write('check-contract: ok\n');
}

try {
  main();
} catch (error: unknown) {
  const message = asMessage(error);
  fail(PREFIX, `Guardrail crashed: ${message}`, { fix: FIX });
}
