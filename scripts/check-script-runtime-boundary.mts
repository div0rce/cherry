import * as fs from 'node:fs';
import * as path from 'node:path';
import fg from 'fast-glob';
import ts from 'typescript';
import { ensureTsEsm } from './lib/ensure-ts-esm.mjs';
import { fail } from './guardrails/lib/fail.mjs';

ensureTsEsm();

const PREFIX = 'check:script-runtime-boundary';
const FIX =
  'Remove script imports from app/ or components/ (Next runtime); use lib/engine/* APIs for proof harnesses.';
const ROOT = process.cwd();

const SCRIPT_GLOBS = ['scripts/**/*.{ts,tsx,js,jsx,mts,cts,mjs,cjs}'];
const IGNORE_GLOBS = ['**/node_modules/**', '**/.next/**', '**/dist/**', '**/build/**'];

type ImportRef = {
  specifier: string;
  line: number;
  col: number;
};

type Violation = {
  file: string;
  line: number;
  col: number;
  specifier: string;
};

const REQUIRE_IDENTIFIERS = new Set(['require', 'requireModule', 'requireFn']);

function normalizePath(filePath: string): string {
  return filePath.split(path.sep).join('/');
}

function scriptKindFor(relPath: string): ts.ScriptKind {
  if (relPath.endsWith('.tsx')) return ts.ScriptKind.TSX;
  if (relPath.endsWith('.jsx')) return ts.ScriptKind.JSX;
  if (
    relPath.endsWith('.ts') ||
    relPath.endsWith('.mts') ||
    relPath.endsWith('.cts')
  ) {
    return ts.ScriptKind.TS;
  }
  return ts.ScriptKind.JS;
}

function positionFor(sourceFile: ts.SourceFile, node: ts.Node): { line: number; col: number } {
  const pos = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
  return { line: pos.line + 1, col: pos.character + 1 };
}

function addImport(
  imports: ImportRef[],
  sourceFile: ts.SourceFile,
  specifier: string,
  node: ts.Node
): void {
  const { line, col } = positionFor(sourceFile, node);
  imports.push({ specifier, line, col });
}

function collectImports(sourceFile: ts.SourceFile): ImportRef[] {
  const imports: ImportRef[] = [];

  const visit = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node) && ts.isStringLiteralLike(node.moduleSpecifier)) {
      addImport(imports, sourceFile, node.moduleSpecifier.text, node);
    } else if (ts.isExportDeclaration(node) && node.moduleSpecifier !== undefined) {
      if (ts.isStringLiteralLike(node.moduleSpecifier)) {
        addImport(imports, sourceFile, node.moduleSpecifier.text, node);
      }
    } else if (ts.isImportEqualsDeclaration(node)) {
      const ref = node.moduleReference;
      if (ts.isExternalModuleReference(ref) && ts.isStringLiteralLike(ref.expression)) {
        addImport(imports, sourceFile, ref.expression.text, node);
      }
    } else if (ts.isCallExpression(node)) {
      if (node.expression.kind === ts.SyntaxKind.ImportKeyword) {
        const arg = node.arguments[0];
        if (arg !== undefined && ts.isStringLiteralLike(arg)) {
          addImport(imports, sourceFile, arg.text, node);
        }
      } else if (ts.isIdentifier(node.expression)) {
        if (REQUIRE_IDENTIFIERS.has(node.expression.text)) {
          const arg = node.arguments[0];
          if (arg !== undefined && ts.isStringLiteralLike(arg)) {
            addImport(imports, sourceFile, arg.text, node);
          }
        }
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return imports;
}

function resolveSpecifier(fromFile: string, specifier: string): string | null {
  if (specifier.startsWith('@/')) return normalizePath(specifier.slice(2));
  if (specifier.startsWith('@ui/')) {
    return normalizePath(path.join('components', 'ui', specifier.slice('@ui/'.length)));
  }
  if (specifier.startsWith('app/')) return normalizePath(specifier);
  if (specifier.startsWith('components/')) return normalizePath(specifier);
  if (specifier.startsWith('lib/client/')) return normalizePath(specifier);
  if (specifier.startsWith('./') || specifier.startsWith('../')) {
    const fromAbs = path.resolve(ROOT, fromFile);
    const resolved = path.resolve(path.dirname(fromAbs), specifier);
    return normalizePath(path.relative(ROOT, resolved));
  }
  return null;
}

function isRuntimeModule(resolved: string): boolean {
  return (
    resolved.startsWith('app/') ||
    resolved.startsWith('components/') ||
    resolved.startsWith('lib/client/')
  );
}

function scanFile(relPath: string): Violation[] {
  const absolute = path.join(ROOT, relPath);
  const content = fs.readFileSync(absolute, 'utf8');
  const sourceFile = ts.createSourceFile(
    relPath,
    content,
    ts.ScriptTarget.ES2022,
    true,
    scriptKindFor(relPath)
  );

  const violations: Violation[] = [];
  for (const imp of collectImports(sourceFile)) {
    const resolved = resolveSpecifier(relPath, imp.specifier);
    if (resolved === null) continue;
    if (!isRuntimeModule(resolved)) continue;
    violations.push({
      file: relPath,
      line: imp.line,
      col: imp.col,
      specifier: imp.specifier,
    });
  }

  return violations;
}

function main(): void {
  const files = fg.sync(SCRIPT_GLOBS, {
    cwd: ROOT,
    ignore: IGNORE_GLOBS,
    onlyFiles: true,
  });

  const violations: Violation[] = [];
  for (const relPath of files.map(normalizePath)) {
    violations.push(...scanFile(relPath));
  }

  if (violations.length > 0) {
    const details = violations.map(
      (violation) =>
        `${violation.file}:${violation.line}:${violation.col}: forbidden import ${violation.specifier}`
    );
    fail(PREFIX, 'Script runtime boundary violations detected', { details, fix: FIX });
  }

  process.stdout.write('check:script-runtime-boundary: ok\n');
}

main();
