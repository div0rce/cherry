import fs from 'node:fs';
import path from 'node:path';
import { ensureTsEsm } from './lib/ensure-ts-esm.mjs';
import { asMessage } from './guardrails/lib/error.mjs';
import { fail } from './guardrails/lib/fail.mjs';
import { importUnknown } from './guardrails/lib/import-typed.mjs';
import { GuardrailRegistrySchema } from './guardrails/lib/read-json.mjs';
import { GUARDRAILS as DEFAULT_GUARDRAILS } from './guardrails/registry.mjs';

ensureTsEsm();

type Violation = {
  file: string;
  message: string;
};

type GuardrailRegistry = Record<string, string>;

const PREFIX = 'check:no-orphan-check-files';
const ROOT_ENV = process.env['CHERRY_GUARDRAIL_REGISTRY_ROOT'];
const ROOT = ROOT_ENV !== undefined && ROOT_ENV !== ''
  ? path.resolve(ROOT_ENV)
  : process.cwd();
const SCRIPT_ROOT = 'scripts';
const CHECK_PREFIX = 'check-';
const CHECK_EXTENSIONS = new Set(['.ts', '.mts', '.js', '.mjs']);

async function loadGuardrails(): Promise<GuardrailRegistry> {
  if (ROOT === process.cwd()) {
    const guardrails: GuardrailRegistry = DEFAULT_GUARDRAILS;
    return guardrails;
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
    fail(PREFIX, `Guardrail registry missing exports in ${registryPath}`, {
      fix: 'Ensure GUARDRAILS is exported from the registry.',
    });
  }
  return parsed.data.GUARDRAILS;
}

function walk(dir: string): string[] {
  if (fs.existsSync(dir) === false) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(fullPath));
    } else {
      files.push(fullPath);
    }
  }
  return files;
}

function isCheckScript(filePath: string): boolean {
  const base = path.basename(filePath);
  if (!base.startsWith(CHECK_PREFIX)) return false;
  return CHECK_EXTENSIONS.has(path.extname(base));
}

function normalize(relativePath: string): string {
  return relativePath.replace(/\\/g, '/');
}

async function main(): Promise<void> {
  const guardrails = await loadGuardrails();
  const guardrailPaths = new Set(Object.values(guardrails).map(normalize));
  const scriptDir = path.join(ROOT, SCRIPT_ROOT);
  const files = walk(scriptDir);
  const violations: Violation[] = [];

  for (const file of files) {
    if (!isCheckScript(file)) continue;
    const relative = normalize(path.relative(ROOT, file));
    if (guardrailPaths.has(relative)) continue;
    violations.push({
      file: relative,
      message: `${relative} is not registered`,
    });
  }

  if (violations.length > 0) {
    const details = violations.map(
      (violation) => `${violation.file}:1:1: ${violation.message}`
    );
    fail(PREFIX, 'Orphan guardrail scripts detected', {
      details,
      fix: 'Register guardrail scripts in scripts/guardrails/registry.mts or delete them.',
    });
  }

  process.stdout.write('no-orphan-check-files: ok\n');
}

void main().catch((error: unknown) => {
  const message = asMessage(error);
  fail(PREFIX, `Guardrail crashed: ${message}`, {
    fix: 'Inspect check-no-orphan-check-files.mts for errors.',
  });
});
