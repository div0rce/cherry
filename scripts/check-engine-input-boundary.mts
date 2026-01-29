import * as fs from 'node:fs';
import * as path from 'node:path';
import * as ts from 'typescript';
import { fail } from './guardrails/lib/fail.mjs';

const ROOT = process.cwd();
const PREFIX = 'check:engine-input-boundary';
const FIX = 'Use EngineInput only from lib/engine/input/EngineInput.js and avoid array indexing in engine boundary code.';

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

function scanElementAccess(filePath: string): string[] {
  const content = fs.readFileSync(filePath, 'utf8');
  const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);
  const violations: string[] = [];

  const visit = (node: ts.Node): void => {
    if (ts.isElementAccessExpression(node)) {
      const { line, col } = toLineCol(sourceFile, node.getStart(sourceFile, false));
      violations.push(`${path.relative(ROOT, filePath)}:${line}:${col}: engine-input-no-indexing`);
    }
    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return violations;
}

function scanImportsAndTypes(filePath: string, canonicalPath: string): string[] {
  const content = fs.readFileSync(filePath, 'utf8');
  const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);
  const relPath = path.relative(ROOT, filePath);
  const violations: string[] = [];

  const visit = (node: ts.Node): void => {
    if (ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node)) {
      if (node.name.text === 'EngineInput' && filePath !== canonicalPath) {
        const { line, col } = toLineCol(sourceFile, node.getStart(sourceFile, false));
        violations.push(`${relPath}:${line}:${col}: engine-input-duplicate-type`);
      }
    }

    if (ts.isExportDeclaration(node) && node.exportClause !== undefined) {
      const exportClause = node.exportClause;
      if (!ts.isNamedExports(exportClause)) {
        ts.forEachChild(node, visit);
        return;
      }
      for (const element of exportClause.elements) {
        const name = element.name.text;
        const alias = element.propertyName?.text;
        if ((name === 'EngineInput' || alias === 'EngineInput') && filePath !== canonicalPath) {
          const { line, col } = toLineCol(sourceFile, node.getStart(sourceFile, false));
          violations.push(`${relPath}:${line}:${col}: engine-input-reexport`);
        }
      }
    }

    if (ts.isImportDeclaration(node) && node.importClause !== undefined) {
      const specifier =
        node.moduleSpecifier !== undefined && ts.isStringLiteral(node.moduleSpecifier)
        ? node.moduleSpecifier.text
        : null;
      if (specifier !== null) {
        const importClause = node.importClause;
        const namedBindings = importClause.namedBindings;
        const hasEngineInputDefault = importClause.name?.text === 'EngineInput';

        const checkSpecifier = (name: string | undefined): void => {
          if (name !== 'EngineInput') return;
          const resolved = resolveImportPath(filePath, specifier);
          if (resolved === null || resolved !== canonicalPath) {
            const { line, col } = toLineCol(sourceFile, node.getStart(sourceFile, false));
            violations.push(`${relPath}:${line}:${col}: engine-input-import-path`);
          }
        };

        if (hasEngineInputDefault) {
          checkSpecifier('EngineInput');
        }

        if (namedBindings !== undefined && ts.isNamedImports(namedBindings)) {
          for (const element of namedBindings.elements) {
            const name = element.name.text;
            const alias = element.propertyName?.text;
            if (name === 'EngineInput' || alias === 'EngineInput') {
              checkSpecifier('EngineInput');
            }
          }
        }
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return violations;
}

const canonicalInputPath = path.join(ROOT, 'lib', 'engine', 'input', 'EngineInput.ts');
const boundaryDir = path.join(ROOT, 'lib', 'engine', 'input');
const boundaryFiles = collectFiles(boundaryDir);
const freezeCheckPath = path.join(ROOT, 'scripts', 'check-engine-freeze.mts');
const indexingFiles = fs.existsSync(freezeCheckPath)
  ? [...boundaryFiles, freezeCheckPath]
  : boundaryFiles;

const projectFiles = [
  ...collectFiles(path.join(ROOT, 'lib')),
  ...collectFiles(path.join(ROOT, 'app')),
  ...collectFiles(path.join(ROOT, 'tests')),
  ...collectFiles(path.join(ROOT, 'scripts')),
  ...collectFiles(path.join(ROOT, 'types')),
];

const violations: string[] = [];

for (const file of indexingFiles) {
  violations.push(...scanElementAccess(file));
}

for (const file of projectFiles) {
  violations.push(...scanImportsAndTypes(file, canonicalInputPath));
}

if (violations.length > 0) {
  fail(PREFIX, 'EngineInput boundary violations detected', {
    details: violations,
    fix: FIX,
  });
}

process.stdout.write('check-engine-input-boundary: OK\n');
