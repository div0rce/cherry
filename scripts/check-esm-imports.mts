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

const PREFIX = 'check:esm-imports';
const FIX =
  'Add explicit runtime extensions (.js/.mjs/.cjs/.json/etc.) to relative import/export specifiers.';
const ROOT_ENV = process.env['CHERRY_ESM_IMPORTS_ROOT'];
const ROOT = ROOT_ENV !== undefined && ROOT_ENV !== '' ? path.resolve(ROOT_ENV) : process.cwd();
const TARGETS = [
  'app/**/*.{ts,tsx,js,jsx,mts,cts,mjs,cjs}',
  'components/**/*.{ts,tsx,js,jsx,mts,cts,mjs,cjs}',
  'lib/**/*.{ts,tsx,js,jsx,mts,cts,mjs,cjs}',
  'scripts/**/*.{ts,tsx,js,jsx,mts,cts,mjs,cjs}',
  'tests/**/*.{ts,tsx,js,jsx,mts,cts,mjs,cjs}',
  'prisma/**/*.{ts,tsx,js,jsx,mts,cts,mjs,cjs}',
  'types/**/*.{ts,tsx,js,jsx,mts,cts,mjs,cjs}',
  'next.config.ts',
  'tailwind.config.ts',
  'proxy.ts',
];

const ALLOWED_EXTENSIONS = new Set([
  '.js',
  '.mjs',
  '.cjs',
  '.json',
  '.css',
  '.png',
  '.svg',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.avif',
  '.ico',
  '.bmp',
]);

const IGNORE = [
  '**/node_modules/**',
  '**/.next/**',
  'tests/fixtures/**',
  '**/dist/**',
  '**/build/**',
  '**/coverage/**',
];

function isRelative(specifier: string): boolean {
  return specifier.startsWith('./') || specifier.startsWith('../');
}

function stripQueryAndHash(specifier: string): string {
  let end = specifier.length;
  const queryIndex = specifier.indexOf('?');
  if (queryIndex !== -1 && queryIndex < end) {
    end = queryIndex;
  }
  const hashIndex = specifier.indexOf('#');
  if (hashIndex !== -1 && hashIndex < end) {
    end = hashIndex;
  }
  return specifier.slice(0, end);
}

function hasRuntimeExtension(specifier: string): boolean {
  const base = stripQueryAndHash(specifier);
  return ALLOWED_EXTENSIONS.has(path.posix.extname(base));
}

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

function checkLiteral(
  violations: Violation[],
  sourceFile: ts.SourceFile,
  node: ts.Node,
  literal: ts.StringLiteral | ts.NoSubstitutionTemplateLiteral,
  label: string
): void {
  const specifier = literal.text;
  if (!isRelative(specifier)) return;
  if (hasRuntimeExtension(specifier)) return;
  addViolation(violations, sourceFile, node, `${label} is missing a runtime extension: ${specifier}`);
}

function scanSourceFile(sourceFile: ts.SourceFile): Violation[] {
  const violations: Violation[] = [];

  function visit(node: ts.Node): void {
    if (ts.isImportDeclaration(node)) {
      const specifier = node.moduleSpecifier;
      if (ts.isStringLiteral(specifier) || ts.isNoSubstitutionTemplateLiteral(specifier)) {
        checkLiteral(violations, sourceFile, node, specifier, 'import');
      }
    } else if (ts.isExportDeclaration(node)) {
      const specifier = node.moduleSpecifier;
      if (
        specifier !== undefined &&
        specifier !== null &&
        (ts.isStringLiteral(specifier) || ts.isNoSubstitutionTemplateLiteral(specifier))
      ) {
        checkLiteral(violations, sourceFile, node, specifier, 'export');
      }
    } else if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      const firstArg = node.arguments[0];
      if (
        firstArg !== undefined &&
        (ts.isStringLiteral(firstArg) || ts.isNoSubstitutionTemplateLiteral(firstArg))
      ) {
        checkLiteral(violations, sourceFile, node, firstArg, 'dynamic import');
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return violations;
}

function main(): void {
  const files = fg.sync(TARGETS, {
    cwd: ROOT,
    dot: true,
    absolute: true,
    ignore: IGNORE,
  });

  const violations: Violation[] = [];

  for (const file of files) {
    const text = ts.sys.readFile(file);
    if (text === undefined) continue;
    const sourceFile = ts.createSourceFile(file, text, ts.ScriptTarget.ES2022, true);
    if (sourceFile.isDeclarationFile) continue;
    violations.push(...scanSourceFile(sourceFile));
  }

  if (violations.length !== 0) {
    const details = violations.map(
      (violation) => `${violation.file}:${violation.line}:${violation.col}: ${violation.message}`
    );
    fail(PREFIX, 'Relative imports must include runtime extensions', { details, fix: FIX });
  }

  process.stdout.write('check:esm-imports: ok\n');
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
