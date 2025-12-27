import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ensureTsEsm } from './lib/ensure-ts-esm.mts';
import {
  GUARDRAILS as DEFAULT_GUARDRAILS,
  GUARDRAIL_ENTRYPOINT as DEFAULT_ENTRYPOINT,
} from './guardrails/registry.mts';

ensureTsEsm();

type GuardrailRegistry = {
  guardrails: readonly string[];
  entrypoint: string;
};

const PREFIX = 'GUARDRAIL REGISTRY VIOLATION';
const ROOT = process.cwd();
const FIXTURE_MODE = process.env['CHERRY_GUARDRAIL_REGISTRY_FIXTURE'] === '1';
const FIXTURE_ROOT = path.join(ROOT, 'tests', 'fixtures', 'guardrails', 'guardrail-registry');
const OVERRIDE_ROOT = process.env['CHERRY_GUARDRAIL_REGISTRY_ROOT'];

function fail(message: string): never {
  process.stderr.write(`${PREFIX}: ${message}\n`);
  process.exit(1);
}

function resolveRoot(): string {
  if (OVERRIDE_ROOT !== undefined && OVERRIDE_ROOT !== '') {
    return path.resolve(OVERRIDE_ROOT);
  }
  if (FIXTURE_MODE === true) {
    return FIXTURE_ROOT;
  }
  return ROOT;
}

async function loadRegistry(rootDir: string): Promise<GuardrailRegistry> {
  const resolvedRoot = path.resolve(rootDir);
  if (resolvedRoot === path.resolve(ROOT)) {
    return { guardrails: DEFAULT_GUARDRAILS, entrypoint: DEFAULT_ENTRYPOINT };
  }
  const registryPath = path.join(resolvedRoot, 'scripts', 'guardrails', 'registry.mts');
  if (!fs.existsSync(registryPath)) {
    fail(`Missing guardrail registry at ${path.relative(ROOT, registryPath)}`);
  }
  const mod = await import(pathToFileURL(registryPath).href);
  const guardrails = mod.GUARDRAILS as readonly string[] | undefined;
  const entrypoint = mod.GUARDRAIL_ENTRYPOINT as string | undefined;
  if (guardrails === undefined || entrypoint === undefined) {
    fail(`Guardrail registry exports missing in ${path.relative(ROOT, registryPath)}`);
  }
  return { guardrails, entrypoint };
}

function readPackageScripts(rootDir: string): Record<string, string> {
  const pkgPath = path.join(rootDir, 'package.json');
  if (!fs.existsSync(pkgPath)) {
    fail(`package.json missing at ${path.relative(ROOT, pkgPath)}`);
  }
  const raw = fs.readFileSync(pkgPath, 'utf8');
  const parsed = JSON.parse(raw) as { scripts?: Record<string, string> };
  const scripts = parsed.scripts;
  if (scripts === undefined) {
    fail('package.json scripts missing');
  }
  return scripts;
}

function walk(dir: string): string[] {
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
  if (!base.startsWith('check-')) return false;
  return base.endsWith('.mts') || base.endsWith('.ts');
}

function commandReferencesFile(command: string, relativePath: string): boolean {
  const normalizedCommand = command.replace(/\\/g, '/');
  const normalizedPath = relativePath.replace(/\\/g, '/');
  if (normalizedCommand.includes(normalizedPath)) return true;
  return normalizedCommand.includes(`./${normalizedPath}`);
}

function parseGuardrailCalls(command: string): string[] {
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

async function main(): Promise<void> {
  const rootDir = resolveRoot();
  const registry = await loadRegistry(rootDir);
  const scripts = readPackageScripts(rootDir);
  const guardrails = [...registry.guardrails];
  const guardrailSet = new Set(guardrails);
  const errors: string[] = [];

  for (const name of guardrails) {
    const script = scripts[name];
    if (script === undefined || script.trim().length === 0) {
      errors.push(`${name} missing from package.json scripts`);
      continue;
    }
    if (script.includes('ts:esm') === false) {
      errors.push(`${name} must use ts:esm`);
    }
  }

  const guardrailCommand = scripts[registry.entrypoint];
  if (guardrailCommand === undefined) {
    errors.push(`${registry.entrypoint} missing from package.json scripts`);
  } else {
    const calls = parseGuardrailCalls(guardrailCommand);
    const missing = guardrails.filter((name) => !calls.includes(name));
    const extra = calls.filter((name) => guardrailSet.has(name) === false);
    if (missing.length > 0) {
      errors.push(`${registry.entrypoint} missing guardrails: ${missing.join(', ')}`);
    }
    if (extra.length > 0) {
      errors.push(`${registry.entrypoint} has extra entries: ${extra.join(', ')}`);
    }
    if (calls.length === guardrails.length) {
      const orderedMismatch = calls.some((name, idx) => name !== guardrails[idx]);
      if (orderedMismatch) {
        errors.push(`${registry.entrypoint} guardrail order must match registry`);
      }
    }
  }

  const scriptsDir = path.join(rootDir, 'scripts');
  const checkFiles = fs.existsSync(scriptsDir)
    ? walk(scriptsDir).filter((file) => isCheckScript(file))
    : [];
  for (const file of checkFiles) {
    const relative = path.relative(rootDir, file);
    const matchingScripts = Object.entries(scripts).filter(([, command]) =>
      commandReferencesFile(command, relative)
    );
    if (matchingScripts.length === 0) {
      errors.push(`${relative} exists but no npm script references it`);
      continue;
    }
    const registered = matchingScripts.some(([name]) => guardrailSet.has(name));
    if (!registered) {
      errors.push(`${relative} exists but is not registered`);
    }
  }

  if (errors.length > 0) {
    for (const err of errors) {
      process.stderr.write(`${PREFIX}: ${err}\n`);
    }
    process.exit(1);
  }

  process.stdout.write('guardrail-registry: ok\n');
}

void main();
