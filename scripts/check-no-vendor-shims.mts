import * as fs from 'node:fs';
import * as path from 'node:path';
import fg from 'fast-glob';
import ts from 'typescript';
import { z } from 'zod';
import { ensureTsEsm } from './lib/ensure-ts-esm.mjs';
import { asMessage } from './guardrails/lib/error.mjs';
import { fail } from './guardrails/lib/fail.mjs';
import { readJsonFile } from './guardrails/lib/read-json.mjs';

ensureTsEsm();

type AllowlistEntry = {
  reason: string;
  upstream: string;
  audit: string;
  removeWhen: string;
};

type Violation = {
  message: string;
};

const PREFIX = 'check:no-vendor-shims';
const FIX =
  'Remove vendor shims or add explicit allowlist entries in scripts/vendor-shims.allowlist.json.';
const ROOT_ENV = process.env['CHERRY_NO_VENDOR_SHIMS_ROOT'];
const ROOT = ROOT_ENV !== undefined && ROOT_ENV !== ''
  ? path.resolve(ROOT_ENV)
  : process.cwd();
const ALLOWLIST_PATH = path.join(ROOT, 'scripts', 'vendor-shims.allowlist.json');

const AllowlistEntrySchema = z
  .object({
    reason: z.string().min(1),
    upstream: z.string().min(1),
    audit: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    removeWhen: z.string().min(1),
  })
  .strict();
const AllowlistSchema = z.record(z.string(), AllowlistEntrySchema);

const VENDOR_DIR = 'types/vendor/';
const PATCH_DIR = 'patches/';
const COMPAT_AUTH_CORE_GLOB = 'types/compat/auth-core-*.*';
const TS_CONFIG_PATTERN = '#paths:';
const GLOB_CHARS = /[*?[\]]/;

const TS_CONFIG_GLOBS = ['**/tsconfig*.json'];
const TS_CONFIG_IGNORE = [
  '**/node_modules/**',
  '**/.next/**',
  '**/dist/**',
  '**/build/**',
  '**/coverage/**',
  '**/out/**',
  '**/.vercel/**',
  '**/tests/fixtures/**',
];

function normalizePath(filePath: string): string {
  return filePath.split(path.sep).join('/');
}

function readAllowlist(): Record<string, AllowlistEntry> {
  if (fs.existsSync(ALLOWLIST_PATH) === false) {
    fail(PREFIX, 'vendor shim allowlist missing', {
      details: [path.normalize(path.relative(ROOT, ALLOWLIST_PATH))],
      fix: 'Add scripts/vendor-shims.allowlist.json (empty is acceptable).',
    });
  }
  const parsed = AllowlistSchema.safeParse(readJsonFile(ALLOWLIST_PATH));
  if (!parsed.success) {
    fail(PREFIX, `Invalid allowlist: ${parsed.error.message}`, {
      fix: 'Fix scripts/vendor-shims.allowlist.json schema.',
    });
  }
  return parsed.data;
}

function parseAllowlist(
  entries: Record<string, AllowlistEntry>
): {
  vendor: Map<string, AllowlistEntry>;
  tsconfig: Map<string, AllowlistEntry>;
  patches: Map<string, AllowlistEntry>;
} {
  const vendor = new Map<string, AllowlistEntry>();
  const tsconfig = new Map<string, AllowlistEntry>();
  const patches = new Map<string, AllowlistEntry>();

  for (const [keyRaw, entry] of Object.entries(entries)) {
    if (keyRaw.includes('\\')) {
      fail(PREFIX, `Allowlist key must use '/' separators: ${keyRaw}`, { fix: FIX });
    }
    if (GLOB_CHARS.test(keyRaw)) {
      fail(PREFIX, `Allowlist key must be an exact path (no globs): ${keyRaw}`, { fix: FIX });
    }
    if (keyRaw.includes(TS_CONFIG_PATTERN)) {
      const [tsconfigPath, pathKey] = keyRaw.split(TS_CONFIG_PATTERN);
      if (!tsconfigPath || !pathKey) {
        fail(PREFIX, `Invalid tsconfig allowlist key: ${keyRaw}`, { fix: FIX });
      }
      tsconfig.set(keyRaw, entry);
      continue;
    }
    if (keyRaw.startsWith(VENDOR_DIR)) {
      vendor.set(keyRaw, entry);
      continue;
    }
    if (keyRaw.startsWith(PATCH_DIR)) {
      patches.set(keyRaw, entry);
      continue;
    }
    fail(PREFIX, `Allowlist key must target ${VENDOR_DIR}, ${PATCH_DIR}, or tsconfig paths: ${keyRaw}`, {
      fix: FIX,
    });
  }

  return { vendor, tsconfig, patches };
}

function parseHeader(content: string): Record<string, string> {
  const lines = content.split(/\r?\n/);
  const meta: Record<string, string> = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length === 0) continue;
    if (!trimmed.startsWith('//')) break;
    const match = trimmed.match(/^\/\/\s*([A-Za-z]+)\s*:\s*(.+)$/);
    if (match === null) continue;
    const key = match[1]?.trim().toLowerCase();
    const value = match[2]?.trim();
    if (key !== undefined && key.length > 0 && value !== undefined && value.length > 0) {
      meta[key] = value;
    }
  }
  return meta;
}

function stripBlockComments(content: string): string {
  return content.replace(/\/\*[\s\S]*?\*\//g, '');
}

function hasDisallowedImports(content: string): boolean {
  const stripped = stripBlockComments(content);
  const importCallPattern = new RegExp(['\\bimport', '\\s*\\('].join(''));
  const lines = stripped.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('//')) continue;
    if (importCallPattern.test(trimmed)) return true;
    if (/\brequire\s*\(/.test(trimmed)) return true;
    if (/^\s*import\s+['"]/.test(trimmed)) return true;
    if (/^\s*import\s+(?!type\b)/.test(trimmed)) return true;
  }
  return false;
}

function validateVendorFile(
  relPath: string,
  entry: AllowlistEntry,
  violations: Violation[]
): void {
  if (!(relPath.endsWith('.d.ts') || relPath.endsWith('.d.cts'))) {
    violations.push({
      message: `${relPath}: allowlisted vendor shim must be .d.ts or .d.cts`,
    });
    return;
  }
  const content = fs.readFileSync(path.join(ROOT, relPath), 'utf8');
  const header = parseHeader(content);
  const expected: Record<string, string> = {
    reason: entry.reason,
    upstream: entry.upstream,
    audit: entry.audit,
    removewhen: entry.removeWhen,
  };
  for (const [key, value] of Object.entries(expected)) {
    if (header[key] === undefined) {
      violations.push({
        message: `${relPath}: missing header ${key} metadata`,
      });
      continue;
    }
    if (header[key] !== value) {
      violations.push({
        message: `${relPath}: header ${key} mismatch (expected "${value}")`,
      });
    }
  }
    if (hasDisallowedImports(content)) {
      violations.push({
      message: `${relPath}: vendor shim must use type-only imports (import type only, no require or dynamic import)`,
      });
    }
}

function collectVendorFiles(): string[] {
  return fg.sync(`${VENDOR_DIR}**/*`, {
    cwd: ROOT,
    onlyFiles: true,
    dot: true,
    ignore: ['**/node_modules/**', '**/.next/**', '**/dist/**', '**/build/**', '**/coverage/**'],
  });
}

function collectCompatAuthCoreFiles(): string[] {
  return fg.sync(COMPAT_AUTH_CORE_GLOB, {
    cwd: ROOT,
    onlyFiles: true,
    dot: true,
    ignore: ['**/node_modules/**', '**/.next/**', '**/dist/**', '**/build/**', '**/coverage/**'],
  });
}

function collectPatchFiles(): string[] {
  return fg.sync(`${PATCH_DIR}**/*.patch`, {
    cwd: ROOT,
    onlyFiles: true,
    dot: true,
    ignore: ['**/node_modules/**', '**/.next/**', '**/dist/**', '**/build/**', '**/coverage/**'],
  });
}

function collectTsconfigFiles(): string[] {
  return fg.sync(TS_CONFIG_GLOBS, {
    cwd: ROOT,
    onlyFiles: true,
    ignore: TS_CONFIG_IGNORE,
  });
}

function readTsconfig(filePath: string): Record<string, unknown> {
  const result = ts.readConfigFile(filePath, ts.sys.readFile);
  if (result.error !== undefined) {
    const message = ts.flattenDiagnosticMessageText(result.error.messageText, '\n');
    fail(PREFIX, `Failed to read ${normalizePath(path.relative(ROOT, filePath))}: ${message}`, {
      fix: FIX,
    });
  }
  const configValue = result.config as unknown;
  if (typeof configValue === 'object' && configValue !== null) {
    return configValue as Record<string, unknown>;
  }
  return {};
}

function normalizeMappingTarget(value: string): string {
  const normalized = value.replace(/\\/g, '/');
  return normalized.startsWith('./') ? normalized.slice(2) : normalized;
}

function main(): void {
  try {
    const allowlist = readAllowlist();
    const { vendor: vendorAllowlist, tsconfig: tsconfigAllowlist, patches: patchAllowlist } =
      parseAllowlist(allowlist);
    const violations: Violation[] = [];

    const compatAuthCoreFiles = collectCompatAuthCoreFiles().map(normalizePath);
    for (const relPath of compatAuthCoreFiles) {
      violations.push({
        message: `${relPath}: auth-core compat shims are forbidden; use patch-package with allowlist`,
      });
    }

    const vendorFiles = collectVendorFiles().map(normalizePath);
    const vendorFileSet = new Set(vendorFiles);

    for (const relPath of vendorFiles) {
      const entry = vendorAllowlist.get(relPath);
      if (entry === undefined) {
        violations.push({
          message: `${relPath}: vendor shim is forbidden (no allowlist entry)`,
        });
        continue;
      }
      validateVendorFile(relPath, entry, violations);
    }

    for (const relPath of vendorAllowlist.keys()) {
      if (!vendorFileSet.has(relPath)) {
        violations.push({
          message: `${relPath}: allowlisted vendor shim missing from repo`,
        });
      }
    }

    const patchFiles = collectPatchFiles().map(normalizePath);
    const patchFileSet = new Set(patchFiles);

    for (const relPath of patchFiles) {
      const entry = patchAllowlist.get(relPath);
      if (entry === undefined) {
        violations.push({
          message: `${relPath}: patch-package file missing allowlist entry`,
        });
      }
    }

    for (const relPath of patchAllowlist.keys()) {
      if (!relPath.endsWith('.patch')) {
        violations.push({
          message: `${relPath}: allowlisted patch must end with .patch`,
        });
      }
      if (!patchFileSet.has(relPath)) {
        violations.push({
          message: `${relPath}: allowlisted patch missing from repo`,
        });
      }
    }

    const tsconfigFiles = collectTsconfigFiles().map(normalizePath);
    const usedPathAllowlist = new Set<string>();

    for (const tsconfigPath of tsconfigFiles) {
      const absolute = path.join(ROOT, tsconfigPath);
      const raw = readTsconfig(absolute);
      const compilerOptions = raw['compilerOptions'];
      if (typeof compilerOptions !== 'object' || compilerOptions === null) continue;
      const paths = (compilerOptions as Record<string, unknown>)['paths'];
      if (typeof paths !== 'object' || paths === null) continue;
      for (const [alias, targets] of Object.entries(paths as Record<string, unknown>)) {
        if (!Array.isArray(targets)) continue;
        const hasVendorTarget = targets.some(
          (value) => typeof value === 'string' && normalizeMappingTarget(value).startsWith(VENDOR_DIR)
        );
        if (!hasVendorTarget) continue;
        const allowKey = `${tsconfigPath}${TS_CONFIG_PATTERN}${alias}`;
        usedPathAllowlist.add(allowKey);
        if (!tsconfigAllowlist.has(allowKey)) {
          violations.push({
            message: `${tsconfigPath}: paths["${alias}"] references ${VENDOR_DIR} without allowlist`,
          });
        }
      }
    }

    for (const allowKey of tsconfigAllowlist.keys()) {
      if (!usedPathAllowlist.has(allowKey)) {
        violations.push({
          message: `${allowKey}: allowlisted tsconfig path not found`,
        });
      }
    }

    if (violations.length > 0) {
      fail(PREFIX, 'Vendor shim policy violations detected', {
        details: violations.map((v) => v.message),
        fix: FIX,
      });
    }

    process.stdout.write('check:no-vendor-shims: ok\n');
  } catch (error: unknown) {
    const message = asMessage(error);
    fail(PREFIX, `Guardrail crashed: ${message}`, { fix: FIX });
  }
}

main();
