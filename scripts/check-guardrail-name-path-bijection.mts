import fs from 'node:fs';
import path from 'node:path';
import { ensureTsEsm } from './lib/ensure-ts-esm.mjs';
import { asMessage } from './guardrails/lib/error.mjs';
import { fail } from './guardrails/lib/fail.mjs';
import { importUnknown } from './guardrails/lib/import-typed.mjs';
import { GuardrailRegistrySchema } from './guardrails/lib/read-json.mjs';
import { GUARDRAILS as DEFAULT_GUARDRAILS, type GuardrailName } from './guardrails/registry.mjs';

ensureTsEsm();

type Violation = {
  message: string;
};

type LoadedRegistry = {
  guardrails: Record<GuardrailName, string>;
  registryPath: string;
};

const PREFIX = 'check:guardrail-name-path-bijection';
const SCRIPT_PREFIX = 'check:';
const SCRIPT_ROOT = 'scripts';
const CHECK_PREFIX = 'check-';
const PATH_PREFIX = `${SCRIPT_ROOT}/${CHECK_PREFIX}`;
const PATH_SUFFIX = '.mts';
const ROOT_ENV = process.env['CHERRY_GUARDRAIL_REGISTRY_ROOT'];
const ROOT = ROOT_ENV !== undefined && ROOT_ENV !== '' ? path.resolve(ROOT_ENV) : process.cwd();

async function loadGuardrails(): Promise<LoadedRegistry> {
  if (ROOT === process.cwd()) {
    const guardrails: Record<GuardrailName, string> = DEFAULT_GUARDRAILS;
    return { guardrails, registryPath: path.join('scripts', 'guardrails', 'registry.mts') };
  }
  const registryPathMts = path.join(ROOT, 'scripts', 'guardrails', 'registry.mts');
  const registryPathTs = path.join(ROOT, 'scripts', 'guardrails', 'registry.ts');
  const registryPath = fs.existsSync(registryPathMts) ? registryPathMts : registryPathTs;
  if (fs.existsSync(registryPath) === false) {
    fail(PREFIX, `Guardrail registry missing at ${registryPath}`, {
      fix: 'Restore scripts/guardrails/registry.mts.',
    });
  }
  const mod: unknown = await importUnknown(registryPath);
  const parsed = GuardrailRegistrySchema.safeParse(mod);
  if (!parsed.success) {
    fail(PREFIX, `Guardrail registry missing in ${registryPath}`, {
      fix: 'Ensure GUARDRAILS is exported from the registry.',
    });
  }
  return {
    guardrails: parsed.data.GUARDRAILS as Record<GuardrailName, string>,
    registryPath: path.relative(ROOT, registryPath),
  };
}

/**
 * Naming invariant:
 * - npm script: check:<name>
 * - file path: scripts/check-<name>.mts
 * - registry key must equal npm script name
 */
function normalizeName(name: GuardrailName): string {
  if (name.startsWith(SCRIPT_PREFIX) === false) {
    fail(PREFIX, `Guardrail name must start with ${SCRIPT_PREFIX}: ${name}`, {
      fix: 'Rename the guardrail to use the check:<name> pattern.',
    });
  }
  const trimmed = name.slice(SCRIPT_PREFIX.length);
  return trimmed.replace(/:/g, '-');
}

function expectedPathFor(name: GuardrailName): string {
  const normalized = normalizeName(name);
  if (normalized.length === 0) {
    fail(PREFIX, `Guardrail name is missing normalized segment: ${name}`, {
      fix: 'Provide a non-empty guardrail name segment.',
    });
  }
  return `${PATH_PREFIX}${normalized}${PATH_SUFFIX}`;
}

async function main(): Promise<void> {
  const { guardrails, registryPath } = await loadGuardrails();
  const violations: Violation[] = [];
  const seenPaths = new Map<string, GuardrailName[]>();
  const guardrailNames = Object.keys(guardrails) as GuardrailName[];

  for (const name of guardrailNames) {
    const expected = expectedPathFor(name);
    const actual = guardrails[name];
    if (typeof actual !== 'string' || actual.length === 0) {
      violations.push({
        message: `${name} missing guardrail path`,
      });
      continue;
    }
    const normalizedActual = path.posix.normalize(actual.replace(/\\/g, '/'));
    if (actual !== normalizedActual) {
      violations.push({
        message: `${name} path must be normalized: ${actual} (normalized ${normalizedActual})`,
      });
    }
    if (actual !== expected) {
      violations.push({
        message: `${name} ↔ ${actual} (expected ${expected})`,
      });
    }
    const existing = seenPaths.get(expected) ?? [];
    existing.push(name);
    seenPaths.set(expected, existing);
  }

  for (const [pathKey, names] of seenPaths.entries()) {
    if (names.length > 1) {
      violations.push({
        message: `Guardrail path aliasing detected for ${pathKey}: ${names.join(', ')}`,
      });
    }
  }

  if (violations.length > 0) {
    const details = violations.map(
      (violation) => `${registryPath}:1:1: ${violation.message}`
    );
    fail(PREFIX, 'Guardrail name/path mismatch detected', {
      details,
      fix: 'Align guardrail names with scripts/check-<name>.mts and update the registry.',
    });
  }

  process.stdout.write('guardrail-name-path-bijection: ok\n');
}

void main().catch((error: unknown) => {
  const message = asMessage(error);
  fail(PREFIX, `Guardrail crashed: ${message}`, {
    fix: 'Inspect check-guardrail-name-path-bijection.mts for errors.',
  });
});
