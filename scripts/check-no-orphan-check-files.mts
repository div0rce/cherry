import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ensureTsEsm } from './lib/ensure-ts-esm.mts';
import { GUARDRAILS as DEFAULT_GUARDRAILS } from './guardrails/registry.mts';

ensureTsEsm();

type Violation = {
  file: string;
  message: string;
};

type GuardrailRegistry = Record<string, string>;

const PREFIX = 'ORPHAN_CHECK_FILE';
const ROOT_ENV = process.env['CHERRY_GUARDRAIL_REGISTRY_ROOT'];
const ROOT = ROOT_ENV !== undefined && ROOT_ENV !== ''
  ? path.resolve(ROOT_ENV)
  : process.cwd();
const SCRIPT_ROOT = 'scripts';
const CHECK_PREFIX = 'check-';
const CHECK_EXTENSIONS = new Set(['.ts', '.mts', '.js', '.mjs']);

function fail(message: string): never {
  process.stderr.write(`${PREFIX}: ${message}\n`);
  process.exit(1);
}

async function loadGuardrails(): Promise<GuardrailRegistry> {
  if (ROOT === process.cwd()) {
    return DEFAULT_GUARDRAILS as GuardrailRegistry;
  }
  const registryPath = path.join(ROOT, 'scripts', 'guardrails', 'registry.mts');
  if (fs.existsSync(registryPath) === false) {
    fail(`Guardrail registry missing at ${registryPath}`);
  }
  const mod = await import(pathToFileURL(registryPath).href);
  const guardrails = mod.GUARDRAILS as GuardrailRegistry | undefined;
  if (guardrails === undefined) {
    fail(`Guardrail registry missing exports in ${registryPath}`);
  }
  return guardrails;
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
  if (base.startsWith(CHECK_PREFIX) === false) return false;
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
    if (isCheckScript(file) === false) continue;
    const relative = normalize(path.relative(ROOT, file));
    if (guardrailPaths.has(relative)) continue;
    violations.push({
      file: relative,
      message: `${relative} is not registered`,
    });
  }

  if (violations.length > 0) {
    for (const violation of violations) {
      process.stderr.write(`${PREFIX}: ${violation.message}\n`);
    }
    process.exit(1);
  }

  process.stdout.write('no-orphan-check-files: ok\n');
}

void main();
