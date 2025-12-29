import fs from 'node:fs';
import path from 'node:path';
import { ensureTsEsm } from './lib/ensure-ts-esm.mts';
import { asMessage } from './guardrails/lib/error.mts';
import { fail } from './guardrails/lib/fail.mts';
import { importUnknown } from './guardrails/lib/import-typed.mts';
import {
  GuardrailRegistrySchema,
  PackageJsonSchema,
  readJsonFile,
} from './guardrails/lib/read-json.mts';
import {
  GUARDRAILS as DEFAULT_GUARDRAILS,
  GUARDRAIL_ENTRYPOINT as DEFAULT_ENTRYPOINT,
} from './guardrails/registry.mts';

ensureTsEsm();

type GuardrailRegistry = {
  guardrails: Record<string, string>;
  entrypoint: string;
  registryPath: string;
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

const PREFIX = 'check:guardrail-registry';
const ROOT = process.cwd();
const FIXTURE_MODE = process.env['CHERRY_GUARDRAIL_REGISTRY_FIXTURE'] === '1';
const FIXTURE_ROOT = path.join(ROOT, 'tests', 'fixtures', 'guardrails', 'guardrail-registry');
const OVERRIDE_ROOT = process.env['CHERRY_GUARDRAIL_REGISTRY_ROOT'];
const RUNNER_PATH = path.join('scripts', 'guardrails', 'run.mts');

function resolveRoot(): string {
  if (OVERRIDE_ROOT !== undefined && OVERRIDE_ROOT !== '') {
    return path.resolve(OVERRIDE_ROOT);
  }
  if (FIXTURE_MODE === true) {
    return FIXTURE_ROOT;
  }
  return ROOT;
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

async function loadRegistry(rootDir: string): Promise<GuardrailRegistry> {
  const resolvedRoot = path.resolve(rootDir);
  if (resolvedRoot === path.resolve(ROOT)) {
    return {
      guardrails: DEFAULT_GUARDRAILS,
      entrypoint: DEFAULT_ENTRYPOINT,
      registryPath: path.join('scripts', 'guardrails', 'registry.mts'),
    };
  }
  const registryPathMts = path.join(resolvedRoot, 'scripts', 'guardrails', 'registry.mts');
  const registryPathTs = path.join(resolvedRoot, 'scripts', 'guardrails', 'registry.ts');
  const registryPath = fs.existsSync(registryPathMts) ? registryPathMts : registryPathTs;
  if (!fs.existsSync(registryPath)) {
    fail(PREFIX, `Missing guardrail registry at ${path.relative(ROOT, registryPath)}`, {
      fix: 'Restore scripts/guardrails/registry.mts.',
    });
  }
  const mod: unknown = await importUnknown(registryPath);
  const parsed = GuardrailRegistrySchema.safeParse(mod);
  if (!parsed.success) {
    fail(PREFIX, `Guardrail registry exports missing in ${path.relative(ROOT, registryPath)}`, {
      fix: 'Ensure GUARDRAILS and GUARDRAIL_ENTRYPOINT are exported.',
    });
  }
  return {
    guardrails: parsed.data.GUARDRAILS,
    entrypoint: parsed.data.GUARDRAIL_ENTRYPOINT,
    registryPath: path.relative(ROOT, registryPath),
  };
}

function readPackageScripts(rootDir: string): PackageScripts {
  const pkgPath = path.join(rootDir, 'package.json');
  if (!fs.existsSync(pkgPath)) {
    fail(PREFIX, `package.json missing at ${path.relative(ROOT, pkgPath)}`, {
      fix: 'Restore package.json with scripts.',
    });
  }
  const raw = fs.readFileSync(pkgPath, 'utf8');
  try {
    const parsed = PackageJsonSchema.parse(readJsonFile(pkgPath));
    if (parsed.scripts === undefined) {
      fail(PREFIX, 'package.json scripts missing', {
        details: [path.relative(ROOT, pkgPath)],
        fix: 'Add a scripts object to package.json.',
      });
    }
    return { scripts: parsed.scripts, raw };
  } catch (err: unknown) {
    const message = asMessage(err);
    fail(PREFIX, `package.json scripts missing: ${message}`, {
      details: [path.relative(ROOT, pkgPath)],
      fix: 'Fix invalid JSON in package.json.',
    });
  }
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

function commandReferencesGuardrail(command: string, name: string): boolean {
  const normalizedCommand = command.replace(/\\/g, '/');
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`(^|\\s)${escaped}(\\s|$)`);
  return pattern.test(normalizedCommand);
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
  const { scripts, raw } = readPackageScripts(rootDir);
  const guardrails = registry.guardrails;
  const guardrailNames = Object.keys(guardrails);
  const guardrailSet = new Set(guardrailNames);
  const violations: Violation[] = [];
  const pkgPath = path.relative(ROOT, path.join(rootDir, 'package.json'));

  for (const name of guardrailNames) {
    const script = scripts[name];
    if (script === undefined || script.trim().length === 0) {
      violations.push({
        file: pkgPath,
        line: 1,
        col: 1,
        message: `${name} missing from package.json scripts`,
      });
      continue;
    }
    if (script.includes('ts:esm') === false) {
      const { line, col } = lineColForToken(raw, `"${name}"`);
      violations.push({
        file: pkgPath,
        line,
        col,
        message: `${name} must use ts:esm`,
      });
    }
    const expectedPath = guardrails[name];
    if (expectedPath === undefined || expectedPath.length === 0) {
      violations.push({
        file: registry.registryPath,
        line: 1,
        col: 1,
        message: `${name} missing guardrail path`,
      });
      continue;
    }
    const expectedAbsolute = path.join(rootDir, expectedPath);
    if (fs.existsSync(expectedAbsolute) === false) {
      violations.push({
        file: expectedPath,
        line: 1,
        col: 1,
        message: `${name} references missing file ${expectedPath}`,
      });
    }
    if (commandReferencesFile(script, RUNNER_PATH) === false) {
      const { line, col } = lineColForToken(raw, `"${name}"`);
      violations.push({
        file: pkgPath,
        line,
        col,
        message: `${name} must invoke ${RUNNER_PATH}`,
      });
    }
    if (commandReferencesGuardrail(script, name) === false) {
      const { line, col } = lineColForToken(raw, `"${name}"`);
      violations.push({
        file: pkgPath,
        line,
        col,
        message: `${name} must pass guardrail name ${name}`,
      });
    }
  }

  const guardrailCommand = scripts[registry.entrypoint];
  if (guardrailCommand === undefined) {
    violations.push({
      file: pkgPath,
      line: 1,
      col: 1,
      message: `${registry.entrypoint} missing from package.json scripts`,
    });
  } else {
    const calls = parseGuardrailCalls(guardrailCommand);
    const missing = guardrailNames.filter((name) => !calls.includes(name));
    const extra = calls.filter((name) => guardrailSet.has(name) === false);
    if (missing.length > 0) {
      violations.push({
        file: pkgPath,
        line: 1,
        col: 1,
        message: `${registry.entrypoint} missing guardrails: ${missing.join(', ')}`,
      });
    }
    if (extra.length > 0) {
      violations.push({
        file: pkgPath,
        line: 1,
        col: 1,
        message: `${registry.entrypoint} has extra entries: ${extra.join(', ')}`,
      });
    }
    if (calls.length === guardrailNames.length) {
      const orderedMismatch = calls.some((name, idx) => name !== guardrailNames[idx]);
      if (orderedMismatch) {
        violations.push({
          file: pkgPath,
          line: 1,
          col: 1,
          message: `${registry.entrypoint} guardrail order must match registry`,
        });
      }
    }
  }

  const scriptsDir = path.join(rootDir, 'scripts');
  const checkFiles = fs.existsSync(scriptsDir)
    ? walk(scriptsDir).filter((file) => isCheckScript(file))
    : [];
  const guardrailPaths = new Set(Object.values(guardrails));
  for (const file of checkFiles) {
    const relative = path.relative(rootDir, file);
    if (guardrailPaths.has(relative) === false) {
      violations.push({
        file: relative,
        line: 1,
        col: 1,
        message: `${relative} exists but is not registered`,
      });
    }
  }

  if (violations.length > 0) {
    const details = violations.map(
      (violation) => `${violation.file}:${violation.line}:${violation.col}: ${violation.message}`
    );
    fail(PREFIX, 'Guardrail registry inconsistencies detected', {
      details,
      fix: 'Sync scripts/guardrails/registry.mts, package.json, and guardrail files.',
    });
  }

  process.stdout.write('guardrail-registry: ok\n');
}

void main().catch((error: unknown) => {
  const message = asMessage(error);
  fail(PREFIX, `Guardrail crashed: ${message}`, {
    fix: 'Inspect check-guardrail-registry.mts for errors.',
  });
});
