#!/usr/bin/env node

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as ts from 'typescript';
import { fail } from './guardrails/lib/fail.mjs';

const ROOT = process.cwd();
const PREFIX = 'check:engine-version-imports';
const FIX = 'Only EngineInput.ts and engine entrypoints may import lib/engine/version.ts.';
const VERSION_PATH = path.join(ROOT, 'lib', 'engine', 'version.ts');

const IGNORE_DIRS = new Set([
  'node_modules',
  '.git',
  '.next',
  'dist',
  'build',
  'out',
  'coverage',
  'dist-scripts',
]);

const TS_EXTENSIONS = new Set(['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx']);

const ALLOWED_IMPORTERS = new Set([
  path.join(ROOT, 'lib', 'engine', 'input', 'EngineInput.ts'),
  path.join(ROOT, 'lib', 'engine', 'run.ts'),
  path.join(ROOT, 'lib', 'engine', 'public.ts'),
]);

// TODO: If the repo grows significantly, scope the scan to engine-related paths.
function collectFiles(startDir: string): string[] {
  const files: string[] = [];
  if (!fs.existsSync(startDir)) return files;
  const stack: string[] = [startDir];
  while (stack.length > 0) {
    const current = stack.pop();
    if (current === undefined) continue;
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (IGNORE_DIRS.has(entry.name)) continue;
        stack.push(fullPath);
        continue;
      }
      if (!TS_EXTENSIONS.has(path.extname(entry.name))) continue;
      files.push(fullPath);
    }
  }
  return files;
}

function toLineCol(sourceFile: ts.SourceFile, pos: number): { line: number; col: number } {
  const { line, character } = sourceFile.getLineAndCharacterOfPosition(pos);
  return { line: line + 1, col: character + 1 };
}

function resolveImportPath(fromFile: string, specifier: string): string | null {
  if (!specifier.startsWith('.')) return null;
  const resolved = path.resolve(path.dirname(fromFile), specifier);
  if (resolved.endsWith('.js')) return `${resolved.slice(0, -3)}.ts`;
  if (resolved.endsWith('.mjs')) return `${resolved.slice(0, -4)}.mts`;
  if (resolved.endsWith('.cjs')) return `${resolved.slice(0, -4)}.cts`;
  return resolved;
}

function scanImports(filePath: string): string[] {
  const content = fs.readFileSync(filePath, 'utf8');
  const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);
  const violations: string[] = [];

  const visit = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node)) {
      const spec = node.moduleSpecifier;
      if (ts.isStringLiteral(spec)) {
        const value = spec.text;
        const resolved = resolveImportPath(filePath, value);
        const isVersionImport =
          (resolved !== null && resolved === VERSION_PATH) ||
          value.endsWith('lib/engine/version.js') ||
          value.endsWith('lib/engine/version.ts');
        if (isVersionImport && !ALLOWED_IMPORTERS.has(filePath)) {
          const { line, col } = toLineCol(sourceFile, node.getStart(sourceFile, false));
          violations.push(`${path.relative(ROOT, filePath)}:${line}:${col}: engine-version-import-forbidden`);
        }
      }
    }
    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return violations;
}

function main(): void {
  const files = collectFiles(ROOT);
  const violations: string[] = [];
  for (const file of files) {
    if (file === VERSION_PATH) continue;
    violations.push(...scanImports(file));
  }
  if (violations.length > 0) {
    fail(PREFIX, 'engine/version imports are restricted', { details: violations, fix: FIX });
  }
  process.stdout.write('check:engine-version-imports: ok\n');
}

main();
