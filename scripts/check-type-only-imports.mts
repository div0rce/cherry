import * as path from 'node:path';
import fg from 'fast-glob';
import ts from 'typescript';
import { ensureTsEsm } from './lib/ensure-ts-esm.mjs';
import { asMessage } from './guardrails/lib/error.mjs';
import { fail } from './guardrails/lib/fail.mjs';

ensureTsEsm();

type Violation = {
  file: string;
  line: number;
  col: number;
  message: string;
};

type ImportBinding = {
  name: string;
  isTypeOnly: boolean;
  node: ts.Node;
  usedInType: boolean;
  usedInValue: boolean;
};

const PREFIX = 'check:type-only-imports';
const FIX = 'Use import type for symbols referenced only in type positions.';
const ROOT_ENV = process.env['CHERRY_TYPE_ONLY_IMPORTS_ROOT'];
const ROOT = ROOT_ENV !== undefined && ROOT_ENV !== '' ? path.resolve(ROOT_ENV) : process.cwd();
const TARGETS = [
  'app/**/*.{ts,tsx,mts,cts}',
  'components/**/*.{ts,tsx,mts,cts}',
  'lib/**/*.{ts,tsx,mts,cts}',
  'scripts/**/*.{ts,tsx,mts,cts}',
  'tests/**/*.{ts,tsx,mts,cts}',
  'prisma/**/*.{ts,tsx,mts,cts}',
  'types/**/*.{ts,tsx,mts,cts}',
  'next.config.ts',
  'tailwind.config.ts',
  'proxy.ts',
];

const IGNORE = [
  '**/node_modules/**',
  '**/.next/**',
  'tests/fixtures/**',
  '**/dist/**',
  '**/build/**',
  '**/coverage/**',
];

function addViolation(
  violations: Violation[],
  sourceFile: ts.SourceFile,
  node: ts.Node,
  message: string
): void {
  const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
  violations.push({
    file: path.relative(ROOT, sourceFile.fileName),
    line: line + 1,
    col: character + 1,
    message,
  });
}

function isImportBindingIdentifier(node: ts.Identifier): boolean {
  const parent = node.parent;
  return (
    ts.isImportClause(parent) ||
    ts.isImportSpecifier(parent) ||
    ts.isNamespaceImport(parent) ||
    ts.isImportEqualsDeclaration(parent)
  );
}

function isTypeOnlyExportUsage(node: ts.Identifier): boolean {
  const parent = node.parent;
  if (!ts.isExportSpecifier(parent)) return false;
  if (parent.isTypeOnly) return true;
  const namedExports = parent.parent;
  if (!ts.isNamedExports(namedExports)) return false;
  const exportDecl = namedExports.parent;
  return ts.isExportDeclaration(exportDecl) && exportDecl.isTypeOnly;
}

function isTypeUsage(node: ts.Identifier): boolean {
  return isTypeOnlyExportUsage(node) || ts.isPartOfTypeNode(node);
}

function recordImportBinding(
  bindings: Map<ts.Symbol, ImportBinding>,
  checker: ts.TypeChecker,
  name: ts.Identifier,
  isTypeOnly: boolean,
  node: ts.Node
): void {
  const symbol = checker.getSymbolAtLocation(name);
  if (symbol === undefined) return;
  bindings.set(symbol, {
    name: name.text,
    isTypeOnly,
    node,
    usedInType: false,
    usedInValue: false,
  });
}

function collectImportBindings(
  sourceFile: ts.SourceFile,
  checker: ts.TypeChecker
): Map<ts.Symbol, ImportBinding> {
  const bindings = new Map<ts.Symbol, ImportBinding>();

  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement)) continue;
    const clause = statement.importClause;
    if (clause === undefined) continue;
    if (clause.name !== undefined) {
      recordImportBinding(bindings, checker, clause.name, clause.isTypeOnly, clause);
    }
    const namedBindings = clause.namedBindings;
    if (namedBindings === undefined) continue;
    if (ts.isNamespaceImport(namedBindings)) {
      recordImportBinding(bindings, checker, namedBindings.name, clause.isTypeOnly, namedBindings);
      continue;
    }
    for (const specifier of namedBindings.elements) {
      const isTypeOnly = clause.isTypeOnly || specifier.isTypeOnly;
      recordImportBinding(bindings, checker, specifier.name, isTypeOnly, specifier);
    }
  }

  return bindings;
}

function scanSourceFile(sourceFile: ts.SourceFile, checker: ts.TypeChecker): Violation[] {
  if (sourceFile.isDeclarationFile) return [];
  const bindings = collectImportBindings(sourceFile, checker);
  if (bindings.size === 0) return [];
  const violations: Violation[] = [];

  function visit(node: ts.Node): void {
    if (ts.isIdentifier(node)) {
      if (isImportBindingIdentifier(node)) {
        return;
      }
      const symbol = checker.getSymbolAtLocation(node);
      if (symbol !== undefined) {
        const binding = bindings.get(symbol);
        if (binding !== undefined) {
          if (isTypeUsage(node)) {
            binding.usedInType = true;
          } else {
            binding.usedInValue = true;
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  for (const binding of bindings.values()) {
    if (!binding.usedInType || binding.usedInValue) continue;
    if (binding.isTypeOnly) continue;
    addViolation(
      violations,
      sourceFile,
      binding.node,
      `${binding.name} is type-only but imported as a value`
    );
  }

  return violations;
}

function main(): void {
  const files = fg.sync(TARGETS, {
    cwd: ROOT,
    dot: true,
    absolute: true,
    ignore: IGNORE,
  });

  const options: ts.CompilerOptions = {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    jsx: ts.JsxEmit.Preserve,
    noResolve: true,
    allowJs: true,
  };

  const program = ts.createProgram({ rootNames: files, options });
  const checker = program.getTypeChecker();
  const targetSet = new Set(files.map((file) => path.resolve(file)));
  const violations: Violation[] = [];

  for (const sourceFile of program.getSourceFiles()) {
    const resolved = path.resolve(sourceFile.fileName);
    if (!targetSet.has(resolved)) continue;
    violations.push(...scanSourceFile(sourceFile, checker));
  }

  if (violations.length !== 0) {
    const details = violations.map(
      (violation) => `${violation.file}:${violation.line}:${violation.col}: ${violation.message}`
    );
    fail(PREFIX, 'Type-only symbols must use import type', { details, fix: FIX });
  }

  process.stdout.write('check:type-only-imports: ok\n');
}

try {
  main();
} catch (error: unknown) {
  if (error instanceof Error && error.name === 'GuardrailFailure') {
    throw error;
  }
  const message = asMessage(error);
  fail(PREFIX, `Guardrail crashed: ${message}`, { fix: FIX });
}
