import fs from 'node:fs';
import path from 'node:path';
import { ensureTsEsm } from './lib/ensure-ts-esm.mjs';
import { asMessage } from './guardrails/lib/error.mjs';
import { fail } from './guardrails/lib/fail.mjs';
import { importUnknown } from './guardrails/lib/import-typed.mjs';
import {
  GuardrailRegistrySchema,
  PackageJsonSchema,
  readJsonFile,
} from './guardrails/lib/read-json.mjs';
import { GUARDRAILS as DEFAULT_GUARDRAILS } from './guardrails/registry.mjs';
import { z } from 'zod';

ensureTsEsm();

type Violation = {
  script: string;
  message: string;
  line: number;
  col: number;
};

type GuardrailRegistry = Record<string, string>;
type ExecutionRegistry = Record<string, string>;

type PackageScripts = {
  scripts: Record<string, string>;
  raw: string;
};

const PREFIX = 'check:no-orphan-scripts';
const ROOT_ENV = process.env['CHERRY_EXECUTION_REGISTRY_ROOT'];
const ROOT = ROOT_ENV !== undefined && ROOT_ENV !== ''
  ? path.resolve(ROOT_ENV)
  : process.cwd();
const SCRIPT_TOKEN = /(^|\s|['"])\.?(\/|\\)?scripts[\/\\]/;
const ALLOWED_PREFIXES = ['check:', 'ingest:', 'audit:', 'backfill:', 'cleanup:', 'report:'];

const ExecutionRegistrySchema = z
  .object({
    EXECUTION: z.record(z.string(), z.string()),
    EXECUTION_RUNNER: z.string(),
  })
  .passthrough();

function lineColForToken(raw: string, token: string): { line: number; col: number } {
  const index = raw.indexOf(token);
  if (index <= 0) return { line: 1, col: 1 };
  const slice = raw.slice(0, index);
  const line = slice.split('\n').length;
  const lastNewline = slice.lastIndexOf('\n');
  const col = lastNewline === -1 ? index + 1 : index - lastNewline;
  return { line, col };
}

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

async function loadExecutionRegistry(): Promise<ExecutionRegistry> {
  const registryPathMts = path.join(ROOT, 'scripts', 'execution', 'registry.mts');
  const registryPathTs = path.join(ROOT, 'scripts', 'execution', 'registry.ts');
  const registryPath = fs.existsSync(registryPathMts) ? registryPathMts : registryPathTs;
  if (fs.existsSync(registryPath) === false) {
    fail(PREFIX, `Execution registry missing at ${registryPath}`, {
      fix: 'Restore scripts/execution/registry.mts.',
    });
  }
  const mod: unknown = await importUnknown(registryPath);
  const parsed = ExecutionRegistrySchema.safeParse(mod);
  if (!parsed.success) {
    fail(PREFIX, `Execution registry missing exports in ${registryPath}`, {
      fix: 'Ensure EXECUTION is exported from the execution registry.',
    });
  }
  return parsed.data.EXECUTION as ExecutionRegistry;
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

function hasAllowedPrefix(name: string): boolean {
  return ALLOWED_PREFIXES.some((prefix) => name.startsWith(prefix));
}

async function main(): Promise<void> {
  const guardrails = await loadGuardrails();
  const execution = await loadExecutionRegistry();
  const { scripts, raw } = readPackageScripts();
  const guardrailNames = new Set(Object.keys(guardrails));
  const executionNames = new Set(Object.keys(execution));
  const violations: Violation[] = [];
  const packagePath = path.normalize(path.relative(ROOT, path.join(ROOT, 'package.json')));

  for (const [name, command] of Object.entries(scripts)) {
    if (SCRIPT_TOKEN.test(command) === false) continue;
    if (guardrailNames.has(name)) continue;
    const { line, col } = lineColForToken(raw, `"${name}"`);
    if (hasAllowedPrefix(name) === false) {
      violations.push({
        script: name,
        message: `${name} references scripts/ but is unregistered`,
        line,
        col,
      });
      continue;
    }
    if (executionNames.has(name) === false) {
      violations.push({
        script: name,
        message: `${name} references scripts/ but is unregistered`,
        line,
        col,
      });
    }
  }

  if (violations.length > 0) {
    const details = violations.map(
      (violation) =>
        `${packagePath}:${violation.line}:${violation.col}: ${violation.script}: ${violation.message}`
    );
    fail(PREFIX, 'Orphan npm scripts detected', {
      details,
      fix: 'Register scripts in the execution registry or remove them.',
    });
  }

  process.stdout.write('no-orphan-scripts: ok\n');
}

void main().catch((error: unknown) => {
  const message = asMessage(error);
  fail(PREFIX, `Guardrail crashed: ${message}`, {
    fix: 'Inspect check-no-orphan-scripts.mts for errors.',
  });
});
