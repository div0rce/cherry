import fs from 'node:fs';
import path from 'node:path';
import { ensureTsEsm } from './lib/ensure-ts-esm.mts';

ensureTsEsm();

type GuardrailCall = {
  file: string;
  body: string;
};

const ROOT = process.cwd();
const TARGET_DIRS = [path.join(ROOT, 'app'), path.join(ROOT, 'lib')];
const EXTENSIONS = new Set(['.ts', '.tsx']);
const SKIP_DIRS = new Set([
  'node_modules',
  '.next',
  'dist',
  'build',
  'coverage',
  'tests',
]);

function fail(message: string): never {
  process.stderr.write(`[guardrail-time] ${message}\n`);
  process.exit(1);
}

function walk(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      files.push(...walk(fullPath));
    } else if (EXTENSIONS.has(path.extname(entry.name))) {
      files.push(fullPath);
    }
  }
  return files;
}

function extractGuardrailCalls(file: string, content: string): GuardrailCall[] {
  const calls: GuardrailCall[] = [];
  const callRegex = /logGuardrailEvent\s*\(/g;
  for (const match of content.matchAll(callRegex)) {
    const matchIndex = match.index ?? 0;
    const openParen = content.indexOf('(', matchIndex);
    const openBrace = content.indexOf('{', openParen);
    if (openParen === -1 || openBrace === -1) {
      continue;
    }
    let depth = 0;
    let end = -1;
    for (let i = openBrace; i < content.length; i += 1) {
      const char = content[i];
      if (char === '{') depth += 1;
      if (char === '}') {
        depth -= 1;
        if (depth === 0) {
          end = i;
          break;
        }
      }
    }
    if (end === -1) {
      fail(`Failed to parse logGuardrailEvent() body in ${file}`);
    }
    calls.push({ file, body: content.slice(openBrace + 1, end) });
  }
  return calls;
}

function expectedSource(file: string): 'boundary' | 'client' | 'engine' | null {
  const normalized = path.normalize(file);
  const apiPrefix = path.normalize(path.join('app', 'api') + path.sep);
  const appPrefix = path.normalize(path.join('app') + path.sep);
  const enginePrefix = path.normalize(path.join('lib', 'engine') + path.sep);

  if (normalized.includes(apiPrefix)) return 'boundary';
  if (normalized.includes(enginePrefix)) return 'engine';
  if (normalized.includes(appPrefix)) return 'client';
  return null;
}

function main(): void {
  const files = TARGET_DIRS.flatMap((dir) => (fs.existsSync(dir) ? walk(dir) : []));
  for (const fileAbs of files) {
    const relative = path.relative(ROOT, fileAbs);
    if (relative === path.normalize(path.join('lib', 'log.ts'))) continue;
    const content = fs.readFileSync(fileAbs, 'utf8');
    if (!content.includes('logGuardrailEvent')) continue;
    const calls = extractGuardrailCalls(relative, content);
    if (calls.length === 0) continue;

    const expected = expectedSource(relative);
    if (!expected) {
      fail(`logGuardrailEvent used outside allowed zones: ${relative}`);
    }
    for (const call of calls) {
      const match = call.body.match(/timestampSource\s*:\s*['"]([^'"]+)['"]/);
      if (!match) {
        fail(`Missing timestampSource in ${call.file}`);
      }
      const actual = match[1];
      if (actual !== expected) {
        fail(
          `Invalid timestampSource in ${call.file} (expected ${expected}, got ${actual ?? 'missing'})`
        );
      }
    }
  }
}

main();
