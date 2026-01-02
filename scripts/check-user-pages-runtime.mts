import fs from 'node:fs';
import path from 'node:path';
import fg from 'fast-glob';
import { ensureTsEsm } from './lib/ensure-ts-esm.mjs';
import { asMessage } from './guardrails/lib/error.mjs';
import { fail } from './guardrails/lib/fail.mjs';

ensureTsEsm();


type ScanResult = {
  file: string;
  token: string;
};

const ROOT = process.cwd();
const argv = process.argv;
const rootArgIndex = argv.indexOf('--root');
let root = ROOT;
if (rootArgIndex !== -1) {
  const next = argv[rootArgIndex + 1];
  if (typeof next === 'string' && next.length > 0) {
    root = path.resolve(next);
  }
} else {
  const inline = argv.find((arg) => arg.startsWith('--root='));
  if (typeof inline === 'string' && inline.length > 0) {
    root = path.resolve(inline.slice('--root='.length));
  }
}

const PAGE_PATTERNS = [
  'app/[(]user[)]/**/page.tsx',
  'app/[(]user[)]/**/layout.tsx',
];

const FORBIDDEN_TOKENS = [
  'initConfigFromEnv',
  'getServerConfig',
  'ServerConfig',
  'lib/engine',
  'lib/adapters',
  'lib/user-context',
  'lib/config',
  'process.env',
];

const ALLOW_STATIC_COMMENT = '// guardrail: allow-static-user-page';
const DYNAMIC_DECLARATION = /export\s+const\s+dynamic\s*=\s*['"]force-dynamic['"];?/;

const EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx'];
const PREFIX = 'check:user-pages-runtime';
const FIX = 'Add force-dynamic to user pages or remove forbidden server tokens.';

function resolveImport(fromFile: string, specifier: string): string | null {
  if (specifier.startsWith('@/')) {
    const absolute = path.join(root, specifier.slice(2));
    return resolveWithExtensions(absolute);
  }
  if (specifier.startsWith('./') || specifier.startsWith('../')) {
    const absolute = path.resolve(path.dirname(fromFile), specifier);
    return resolveWithExtensions(absolute);
  }
  return null;
}

function resolveWithExtensions(base: string): string | null {
  const stat = exists(base);
  if (stat === 'file') return base;
  if (stat === 'dir') {
    for (const ext of EXTENSIONS) {
      const candidate = path.join(base, `index${ext}`);
      if (exists(candidate) === 'file') return candidate;
    }
  }
  for (const ext of EXTENSIONS) {
    const candidate = `${base}${ext}`;
    if (exists(candidate) === 'file') return candidate;
  }
  return null;
}

function exists(candidate: string): 'file' | 'dir' | 'none' {
  try {
    const stat = fs.statSync(candidate);
    if (stat.isFile()) return 'file';
    if (stat.isDirectory()) return 'dir';
    return 'none';
  } catch (error: unknown) {
    void error;
    return 'none';
  }
}

function extractImports(content: string): string[] {
  const imports: string[] = [];
  const importFrom = /import\s+[^'"\n]+?\s+from\s+['"]([^'"]+)['"]/g;
  const importOnly = /import\s+['"]([^'"]+)['"]/g;
  let match: RegExpExecArray | null = importFrom.exec(content);
  while (match !== null) {
    const spec = match[1];
    if (typeof spec === 'string') imports.push(spec);
    match = importFrom.exec(content);
  }
  match = importOnly.exec(content);
  while (match !== null) {
    const spec = match[1];
    if (typeof spec === 'string') imports.push(spec);
    match = importOnly.exec(content);
  }
  return imports;
}

function findForbiddenToken(entryFile: string): ScanResult | null {
  const queue = [entryFile];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const current = queue.shift();
    if (current === undefined) continue;
    if (visited.has(current)) continue;
    visited.add(current);

    let content = '';
    try {
      content = fs.readFileSync(current, 'utf8');
    } catch (error: unknown) {
      void error;
      continue;
    }

    for (const token of FORBIDDEN_TOKENS) {
      if (content.includes(token)) {
        return { file: current, token };
      }
    }

    for (const specifier of extractImports(content)) {
      const resolved = resolveImport(current, specifier);
      if (typeof resolved === 'string' && resolved.length > 0) {
        queue.push(resolved);
      }
    }
  }

  return null;
}

function hasAllowStaticComment(content: string): boolean {
  const lines = content.split(/\r?\n/).slice(0, 10);
  return lines.some((line) => line.includes(ALLOW_STATIC_COMMENT));
}

function main(): void {
  const pages = fg.sync(PAGE_PATTERNS, { cwd: root, absolute: true }).sort();
  const violations: string[] = [];

  for (const file of pages) {
    const relative = path.normalize(path.relative(root, file));
    const content = fs.readFileSync(file, 'utf8');
    const hasDynamic = DYNAMIC_DECLARATION.test(content);
    const allowStatic = hasAllowStaticComment(content);

    if (hasDynamic) {
      const forbidden = findForbiddenToken(file);
      if (forbidden !== null) {
        const tokenFile = path.normalize(path.relative(root, forbidden.file));
        violations.push(
          `${relative}:1:1: forbidden token ${forbidden.token} (${tokenFile})`
        );
      }
      continue;
    }

    if (!allowStatic) {
      violations.push(`${relative}:1:1: missing force-dynamic`);
    }

    const forbidden = findForbiddenToken(file);
    if (forbidden !== null) {
      const token = forbidden.token;
      const tokenFile = path.normalize(path.relative(root, forbidden.file));
      violations.push(`${relative}:1:1: ${token} (${tokenFile})`);
    }
  }

  if (violations.length > 0) {
    fail(PREFIX, 'User pages runtime violations detected', {
      details: violations,
      fix: FIX,
    });
  }

  process.stdout.write('check-user-pages-runtime: ok\n');
}

try {
  main();
} catch (error: unknown) {
  const message = asMessage(error);
  fail(PREFIX, `Guardrail crashed: ${message}`, { fix: FIX });
}
