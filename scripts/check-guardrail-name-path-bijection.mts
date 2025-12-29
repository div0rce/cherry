import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ensureTsEsm } from './lib/ensure-ts-esm.mts';
import { GUARDRAILS as DEFAULT_GUARDRAILS, type GuardrailName } from './guardrails/registry.mts';

ensureTsEsm();

type Violation = {
  message: string;
};

const PREFIX = 'NAME_PATH_MISMATCH';
const SCRIPT_PREFIX = 'check:';
const SCRIPT_ROOT = 'scripts';
const CHECK_PREFIX = 'check-';
const PATH_PREFIX = `${SCRIPT_ROOT}/${CHECK_PREFIX}`;
const PATH_SUFFIX = '.mts';
const ROOT_ENV = process.env['CHERRY_GUARDRAIL_REGISTRY_ROOT'];
const ROOT = ROOT_ENV !== undefined && ROOT_ENV !== '' ? path.resolve(ROOT_ENV) : process.cwd();

function fail(message: string): never {
  process.stderr.write(`${PREFIX}: ${message}\n`);
  process.exit(1);
}

async function loadGuardrails(): Promise<Record<GuardrailName, string>> {
  if (ROOT === process.cwd()) {
    return DEFAULT_GUARDRAILS as Record<GuardrailName, string>;
  }
  const registryPath = path.join(ROOT, 'scripts', 'guardrails', 'registry.mts');
  if (fs.existsSync(registryPath) === false) {
    fail(`Guardrail registry missing at ${registryPath}`);
  }
  const mod = await import(pathToFileURL(registryPath).href);
  const guardrails = mod.GUARDRAILS as Record<GuardrailName, string> | undefined;
  if (guardrails === undefined) {
    fail(`Guardrail registry missing in ${registryPath}`);
  }
  return guardrails;
}

function normalizeName(name: GuardrailName): string {
  if (name.startsWith(SCRIPT_PREFIX) === false) {
    fail(`Guardrail name must start with ${SCRIPT_PREFIX}: ${name}`);
  }
  const trimmed = name.slice(SCRIPT_PREFIX.length);
  return trimmed.replace(/:/g, '-');
}

function expectedPathFor(name: GuardrailName): string {
  const normalized = normalizeName(name);
  if (normalized.length === 0) {
    fail(`Guardrail name is missing normalized segment: ${name}`);
  }
  return `${PATH_PREFIX}${normalized}${PATH_SUFFIX}`;
}

async function main(): Promise<void> {
  const guardrails = await loadGuardrails();
  const violations: Violation[] = [];
  const seenPaths = new Map<string, GuardrailName[]>();
  const guardrailNames = Object.keys(guardrails) as GuardrailName[];

  for (const name of guardrailNames) {
    const expected = expectedPathFor(name);
    const actual = guardrails[name];
    if (actual !== expected) {
      violations.push({
        message: `${name} ↔ ${actual}`,
      });
    }
    const existing = seenPaths.get(expected) ?? [];
    existing.push(name);
    seenPaths.set(expected, existing);
  }

  for (const [path, names] of seenPaths.entries()) {
    if (names.length > 1) {
      violations.push({
        message: `Guardrail path aliasing detected for ${path}: ${names.join(', ')}`,
      });
    }
  }

  if (violations.length > 0) {
    for (const violation of violations) {
      process.stderr.write(`${PREFIX}: ${violation.message}\n`);
    }
    process.exit(1);
  }

  process.stdout.write('guardrail-name-path-bijection: ok\n');
}

void main();
