import * as fs from 'node:fs';
import * as path from 'node:path';
import { z } from 'zod';
import { ensureTsEsm } from './lib/ensure-ts-esm.mjs';
import { asMessage } from './guardrails/lib/error.mjs';
import { fail } from './guardrails/lib/fail.mjs';
import { importUnknown } from './guardrails/lib/import-typed.mjs';
import {
  PackageJsonSchema,
  readJsonFile,
} from './guardrails/lib/read-json.mjs';
import {
  EXECUTION as DEFAULT_EXECUTION,
  EXECUTION_RUNNER as DEFAULT_RUNNER,
  EXECUTION_DB_RUNNER as DEFAULT_DB_RUNNER,
  EXECUTION_DB_NAMES as DEFAULT_DB_NAMES,
} from './execution/registry.mjs';

ensureTsEsm();

type ExecutionRegistry = Record<string, string>;

type ExecutionConfig = {
  execution: ExecutionRegistry;
  runner: string;
  dbRunner: string;
  dbNames: Set<string>;
};

type Violation = {
  file: string;
  line: number;
  col: number;
  message: string;
};

type PackageScripts = {
  scripts: Record<string, string>;
  raw: string;
};

const PREFIX = 'check:execution-registry-completeness';
const ROOT_ENV = process.env['CHERRY_EXECUTION_REGISTRY_ROOT'];
const ROOT = ROOT_ENV !== undefined && ROOT_ENV !== ''
  ? path.resolve(ROOT_ENV)
  : process.cwd();
const SCRIPTS_DIR = path.join(ROOT, 'scripts');
const GUARDRAILS_DIR = path.join(ROOT, 'scripts', 'guardrails');
const EXECUTION_DIR = path.join(ROOT, 'scripts', 'execution');
const LIB_DIR = path.join(ROOT, 'scripts', 'lib');
const EXECUTION_EXTENSIONS = new Set(['.mts', '.mjs', '.js', '.cjs']);

const ExecutionRegistrySchema = z
  .object({
    EXECUTION: z.record(z.string(), z.string()),
    EXECUTION_RUNNER: z.string(),
    EXECUTION_DB_RUNNER: z.string().optional(),
    EXECUTION_DB_NAMES: z.array(z.string()).optional(),
  })
  .passthrough();

function normalizePath(value: string): string {
  return value.replace(/\\/g, '/');
}

function resolveRegistryPath(): string {
  const mtsPath = path.join(ROOT, 'scripts', 'execution', 'registry.mts');
  if (fs.existsSync(mtsPath)) return mtsPath;
  const tsPath = path.join(ROOT, 'scripts', 'execution', 'registry.ts');
  if (fs.existsSync(tsPath)) return tsPath;
  return mtsPath;
}

function lineColForToken(raw: string, token: string): { line: number; col: number } {
  const index = raw.indexOf(token);
  if (index <= 0) return { line: 1, col: 1 };
  const slice = raw.slice(0, index);
  const line = slice.split('\n').length;
  const lastNewline = slice.lastIndexOf('\n');
  const col = lastNewline === -1 ? index + 1 : index - lastNewline;
  return { line, col };
}

async function loadRegistry(): Promise<ExecutionConfig> {
  if (ROOT === process.cwd()) {
    const execution: ExecutionRegistry = DEFAULT_EXECUTION;
    return {
      execution,
      runner: DEFAULT_RUNNER,
      dbRunner: DEFAULT_DB_RUNNER,
      dbNames: new Set(DEFAULT_DB_NAMES),
    };
  }
  const registryPath = resolveRegistryPath();
  if (fs.existsSync(registryPath) === false) {
    fail(PREFIX, `Execution registry missing at ${registryPath}`, {
      fix: 'Restore scripts/execution/registry.mts.',
    });
  }
  const mod: unknown = await importUnknown(registryPath);
  const parsed = ExecutionRegistrySchema.safeParse(mod);
  if (!parsed.success) {
    fail(PREFIX, `Execution registry exports missing in ${registryPath}`, {
      fix: 'Ensure EXECUTION and EXECUTION_RUNNER are exported.',
    });
  }
  const dbRunner = parsed.data.EXECUTION_DB_RUNNER ?? parsed.data.EXECUTION_RUNNER;
  const dbNames = parsed.data.EXECUTION_DB_NAMES ?? [];
  return {
    execution: parsed.data.EXECUTION,
    runner: parsed.data.EXECUTION_RUNNER,
    dbRunner,
    dbNames: new Set(dbNames),
  };
}

function readPackageScripts(): PackageScripts {
  const packagePath = path.join(ROOT, 'package.json');
  if (fs.existsSync(packagePath) === false) {
    fail(PREFIX, 'package.json missing', {
      details: [path.normalize(path.relative(ROOT, packagePath))],
      fix: 'Restore package.json with scripts.',
    });
  }
  const raw = fs.readFileSync(packagePath, 'utf8');
  try {
    const parsed = PackageJsonSchema.parse(readJsonFile(packagePath));
    if (parsed.scripts === undefined) {
      fail(PREFIX, 'package.json scripts missing', {
        details: [path.normalize(path.relative(ROOT, packagePath))],
        fix: 'Add a scripts object to package.json.',
      });
    }
    return { scripts: parsed.scripts, raw };
  } catch (err: unknown) {
    const message = asMessage(err);
    fail(PREFIX, `package.json scripts missing: ${message}`, {
      details: [path.normalize(path.relative(ROOT, packagePath))],
      fix: 'Fix invalid JSON in package.json.',
    });
  }
}

function commandReferences(command: string, token: string): boolean {
  const normalizedCommand = normalizePath(command);
  const normalizedToken = normalizePath(token);
  if (normalizedCommand.includes(normalizedToken)) return true;
  return normalizedCommand.includes(`./${normalizedToken}`);
}

function isValidExecutionPath(scriptPath: string): boolean {
  const normalized = normalizePath(scriptPath);
  if (!normalized.startsWith('scripts/')) return false;
  if (normalized.includes('..')) return false;
  const ext = path.extname(normalized);
  if (!EXECUTION_EXTENSIONS.has(ext)) return false;
  if (normalized.startsWith('scripts/guardrails/')) return false;
  if (normalized.startsWith('scripts/execution/')) return false;
  if (normalized.startsWith('scripts/lib/')) return false;
  return true;
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

function listExecutionCandidates(): string[] {
  const files = walk(SCRIPTS_DIR);
  const candidates: string[] = [];
  for (const file of files) {
    const ext = path.extname(file);
    if (!EXECUTION_EXTENSIONS.has(ext)) continue;
    if (file.startsWith(GUARDRAILS_DIR)) continue;
    if (file.startsWith(EXECUTION_DIR)) continue;
    if (file.startsWith(LIB_DIR)) continue;
    const base = path.basename(file);
    if (base.startsWith('check-')) continue;
    candidates.push(file);
  }
  return candidates;
}

async function main(): Promise<void> {
  const { execution, runner, dbRunner, dbNames } = await loadRegistry();
  const { scripts, raw } = readPackageScripts();
  const violations: Violation[] = [];
  const pkgPath = path.normalize(path.relative(ROOT, path.join(ROOT, 'package.json')));

  for (const [name, scriptPath] of Object.entries(execution)) {
    if (!isValidExecutionPath(scriptPath)) {
      violations.push({
        file: scriptPath,
        line: 1,
        col: 1,
        message: `${name} has invalid registry path ${scriptPath}`,
      });
      continue;
    }
    const command = scripts[name];
    if (command === undefined || command.trim().length === 0) {
      violations.push({
        file: pkgPath,
        line: 1,
        col: 1,
        message: `${name} missing from package.json scripts`,
      });
      continue;
    }
    const requiredRunner = dbNames.has(name) ? dbRunner : runner;
    if (commandReferences(command, requiredRunner) === false) {
      const { line, col } = lineColForToken(raw, `"${name}"`);
      violations.push({
        file: pkgPath,
        line,
        col,
        message: `${name} must invoke ${requiredRunner}`,
      });
    }
    if (command.includes(name) === false) {
      const { line, col } = lineColForToken(raw, `"${name}"`);
      violations.push({
        file: pkgPath,
        line,
        col,
        message: `${name} must pass execution name ${name}`,
      });
    }
    const absolute = path.join(ROOT, scriptPath);
    if (fs.existsSync(absolute) === false) {
      violations.push({
        file: scriptPath,
        line: 1,
        col: 1,
        message: `${name} references missing file ${scriptPath}`,
      });
    }
  }

  const runnerTokens = new Set([runner, dbRunner]);
  const runnerNormalized = new Set(Array.from(runnerTokens, normalizePath));
  for (const [name, command] of Object.entries(scripts)) {
    if (Object.prototype.hasOwnProperty.call(execution, name)) continue;
    const normalizedCommand = normalizePath(command);
    const hasRunner = Array.from(runnerNormalized).some((token) =>
      normalizedCommand.includes(token)
    );
    if (hasRunner) {
      const { line, col } = lineColForToken(raw, `"${name}"`);
      violations.push({
        file: pkgPath,
        line,
        col,
        message: `${name} invokes an execution runner but is not registered`,
      });
    }
  }

  const registeredPaths = new Set(Object.values(execution).map(normalizePath));
  const candidates = listExecutionCandidates();
  for (const file of candidates) {
    const relative = normalizePath(path.relative(ROOT, file));
    if (registeredPaths.has(relative)) continue;
    violations.push({
      file: relative,
      line: 1,
      col: 1,
      message: `Execution script missing from registry: ${relative}`,
    });
  }

  if (violations.length > 0) {
    const details = violations.map(
      (violation) => `${violation.file}:${violation.line}:${violation.col}: ${violation.message}`
    );
    fail(PREFIX, 'Execution registry completeness violations detected', {
      details,
      fix: 'Register execution scripts in scripts/execution/registry.mts or remove them.',
    });
  }

  process.stdout.write('execution-registry-completeness: ok\n');
}

void main().catch((error: unknown) => {
  const message = asMessage(error);
  fail(PREFIX, `Guardrail crashed: ${message}`, {
    fix: 'Inspect check-execution-registry-completeness.mts for errors.',
  });
});
