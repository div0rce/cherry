import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ensureTsEsm } from './lib/ensure-ts-esm.mts';
import {
  EXECUTION as DEFAULT_EXECUTION,
  EXECUTION_RUNNER as DEFAULT_RUNNER,
} from './execution/registry.mts';

ensureTsEsm();

type ExecutionRegistry = Record<string, string>;

type ExecutionConfig = {
  execution: ExecutionRegistry;
  runner: string;
};

const PREFIX = 'EXEC_REGISTRY_MISSING';
const ROOT_ENV = process.env['CHERRY_EXECUTION_REGISTRY_ROOT'];
const ROOT = ROOT_ENV !== undefined && ROOT_ENV !== ''
  ? path.resolve(ROOT_ENV)
  : process.cwd();

function fail(message: string): never {
  process.stderr.write(`${PREFIX}: ${message}\n`);
  process.exit(1);
}

async function loadRegistry(): Promise<ExecutionConfig> {
  if (ROOT === process.cwd()) {
    return { execution: DEFAULT_EXECUTION as ExecutionRegistry, runner: DEFAULT_RUNNER };
  }
  const registryPath = path.join(ROOT, 'scripts', 'execution', 'registry.mts');
  if (fs.existsSync(registryPath) === false) {
    fail(`Execution registry missing at ${registryPath}`);
  }
  const mod = await import(pathToFileURL(registryPath).href);
  const execution = mod.EXECUTION as ExecutionRegistry | undefined;
  const runner = mod.EXECUTION_RUNNER as string | undefined;
  if (execution === undefined || runner === undefined) {
    fail(`Execution registry exports missing in ${registryPath}`);
  }
  return { execution, runner };
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

function commandReferences(command: string, token: string): boolean {
  const normalizedCommand = command.replace(/\\/g, '/');
  const normalizedToken = token.replace(/\\/g, '/');
  if (normalizedCommand.includes(normalizedToken)) return true;
  return normalizedCommand.includes(`./${normalizedToken}`);
}

async function main(): Promise<void> {
  const { execution, runner } = await loadRegistry();
  const scripts = readPackageScripts();
  const errors: string[] = [];

  for (const [name, scriptPath] of Object.entries(execution)) {
    const command = scripts[name];
    if (command === undefined || command.trim().length === 0) {
      errors.push(`${name} missing from package.json scripts`);
      continue;
    }
    if (commandReferences(command, runner) === false) {
      errors.push(`${name} must invoke ${runner}`);
    }
    if (command.includes(name) === false) {
      errors.push(`${name} must pass execution name ${name}`);
    }
    const absolute = path.join(ROOT, scriptPath);
    if (fs.existsSync(absolute) === false) {
      errors.push(`${name} references missing file ${scriptPath}`);
    }
  }

  const runnerNormalized = runner.replace(/\\/g, '/');
  for (const [name, command] of Object.entries(scripts)) {
    if (Object.prototype.hasOwnProperty.call(execution, name)) continue;
    const normalizedCommand = command.replace(/\\/g, '/');
    if (normalizedCommand.includes(runnerNormalized)) {
      errors.push(`${name} invokes ${runner} but is not registered`);
    }
  }

  if (errors.length > 0) {
    for (const err of errors) {
      process.stderr.write(`${PREFIX}: ${err}\n`);
    }
    process.exit(1);
  }

  process.stdout.write('execution-registry-completeness: ok\n');
}

void main();
