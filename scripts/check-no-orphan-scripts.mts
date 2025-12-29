import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ensureTsEsm } from './lib/ensure-ts-esm.mts';
import { GUARDRAILS as DEFAULT_GUARDRAILS } from './guardrails/registry.mts';

ensureTsEsm();

type Violation = {
  script: string;
  message: string;
};

type GuardrailRegistry = Record<string, string>;
type ExecutionRegistry = Record<string, string>;

const PREFIX = 'ORPHAN_NPM_SCRIPT';
const ROOT_ENV = process.env['CHERRY_EXECUTION_REGISTRY_ROOT'];
const ROOT = ROOT_ENV !== undefined && ROOT_ENV !== ''
  ? path.resolve(ROOT_ENV)
  : process.cwd();
const SCRIPT_TOKEN = /(^|\s|['"])\.?(\/|\\)?scripts[\/\\]/;
const ALLOWED_PREFIXES = ['check:', 'ingest:', 'audit:', 'backfill:', 'cleanup:', 'report:'];

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

async function loadExecutionRegistry(): Promise<ExecutionRegistry> {
  const registryPath = path.join(ROOT, 'scripts', 'execution', 'registry.mts');
  if (fs.existsSync(registryPath) === false) {
    fail(`Execution registry missing at ${registryPath}`);
  }
  const mod = await import(pathToFileURL(registryPath).href);
  const execution = mod.EXECUTION as ExecutionRegistry | undefined;
  if (execution === undefined) {
    fail(`Execution registry missing exports in ${registryPath}`);
  }
  return execution;
}

function readPackageScripts(): Record<string, string> {
  const packagePath = path.join(ROOT, 'package.json');
  if (fs.existsSync(packagePath) === false) {
    fail('package.json missing');
  }
  const raw = fs.readFileSync(packagePath, 'utf8');
  const parsed = JSON.parse(raw) as { scripts?: Record<string, string> };
  const scripts = parsed.scripts;
  if (scripts === undefined) {
    fail('package.json scripts missing');
  }
  return scripts;
}

function hasAllowedPrefix(name: string): boolean {
  return ALLOWED_PREFIXES.some((prefix) => name.startsWith(prefix));
}

async function main(): Promise<void> {
  const guardrails = await loadGuardrails();
  const execution = await loadExecutionRegistry();
  const scripts = readPackageScripts();
  const guardrailNames = new Set(Object.keys(guardrails));
  const executionNames = new Set(Object.keys(execution));
  const violations: Violation[] = [];

  for (const [name, command] of Object.entries(scripts)) {
    if (SCRIPT_TOKEN.test(command) === false) continue;
    if (guardrailNames.has(name)) continue;
    if (hasAllowedPrefix(name) === false) {
      violations.push({
        script: name,
        message: `${name} references scripts/ but is unregistered`,
      });
      continue;
    }
    if (executionNames.has(name) === false) {
      violations.push({
        script: name,
        message: `${name} references scripts/ but is unregistered`,
      });
    }
  }

  if (violations.length > 0) {
    for (const violation of violations) {
      process.stderr.write(`${PREFIX}: ${violation.message}\n`);
    }
    process.exit(1);
  }

  process.stdout.write('no-orphan-scripts: ok\n');
}

void main();
