import fs from 'node:fs';
import path from 'node:path';
import { ensureTsEsm } from './lib/ensure-ts-esm.mts';

ensureTsEsm();


type Violation = { file: string; line: number; col: number; message: string };

const ROOT = process.cwd();
const EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.mjs',
  '.cjs',
  '.mts',
]);
const IGNORE_DIRS = new Set([
  'node_modules',
  '.next',
  'out',
  'build',
  'dist',
  'dist-scripts',
  'public',
  'data',
  'docs',
  'prisma',
  '.git',
]);

const REGISTER_PATTERN = /registerServerConfigLoader\s*\(/;
const ALLOW_IMPLICIT_TIME_PATTERN = /resolveNow\s*\([^)]*allowImplicit\s*:\s*true/;
const LOAD_CONFIG_PATTERN = /loadConfigsFromEnv\s*\(/;
const ALLOWED_REGISTER_PATH = path.normalize(path.join('lib', 'config', 'init.ts'));

function isBoundary(filePath: string): boolean {
  const normalized = path.normalize(filePath);
  return (
    normalized.includes(`${path.sep}app${path.sep}api${path.sep}`) ||
    normalized.includes(`${path.sep}scripts${path.sep}`) ||
    normalized.includes(`${path.sep}tests${path.sep}`)
  );
}

function shouldSkip(entry: fs.Dirent): boolean {
  if (!entry.isDirectory()) return false;
  return IGNORE_DIRS.has(entry.name);
}

function collectFiles(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (shouldSkip(entry)) continue;
    if (entry.isDirectory()) {
      files.push(...collectFiles(fullPath));
      continue;
    }
    if (!EXTENSIONS.has(path.extname(fullPath))) continue;
    files.push(fullPath);
  }
  return files;
}

function checkFile(filePath: string): Violation[] {
  const content = fs.readFileSync(filePath, 'utf8');
  const relativePath = path.normalize(path.relative(ROOT, filePath));
  const violations: Violation[] = [];

  if (REGISTER_PATTERN.test(content) && relativePath !== ALLOWED_REGISTER_PATH) {
    const idx = content.search(REGISTER_PATTERN);
    const prefix = content.slice(0, idx);
    const lastNewline = prefix.lastIndexOf('\n');
    violations.push({
      file: relativePath,
      line: prefix.split(/\r?\n/).length,
      col: lastNewline === -1 ? idx + 1 : idx - lastNewline,
      message: 'registerServerConfigLoader is only allowed inside lib/config/init.ts',
    });
  }

  if (ALLOW_IMPLICIT_TIME_PATTERN.test(content) && !isBoundary(filePath)) {
    const idx = content.search(ALLOW_IMPLICIT_TIME_PATTERN);
    const prefix = content.slice(0, idx);
    const lastNewline = prefix.lastIndexOf('\n');
    violations.push({
      file: relativePath,
      line: prefix.split(/\r?\n/).length,
      col: lastNewline === -1 ? idx + 1 : idx - lastNewline,
      message: 'resolveNow allowImplicit is only allowed in app/api/**, scripts/**, or tests/**',
    });
  }

  if (LOAD_CONFIG_PATTERN.test(content)) {
    const idx = content.search(LOAD_CONFIG_PATTERN);
    const prefix = content.slice(0, idx);
    const lastNewline = prefix.lastIndexOf('\n');
    violations.push({
      file: relativePath,
      line: prefix.split(/\r?\n/).length,
      col: lastNewline === -1 ? idx + 1 : idx - lastNewline,
      message: 'loadConfigsFromEnv is forbidden; use initConfigFromEnv at boundaries only',
    });
  }

  return violations;
}

function main(): void {
  const files = collectFiles(ROOT);
  const violations: Violation[] = [];
  for (const file of files) {
    violations.push(...checkFile(file));
  }

  if (violations.length > 0) {
    for (const v of violations) {
      console.error(`${v.file}:${v.line}:${v.col}: ${v.message}`);
    }
    process.exit(1);
  }

  console.warn('check-config-init: ok');
}

main();
