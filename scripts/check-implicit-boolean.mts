import path from 'node:path';
import ts from 'typescript';
import { ensureTsEsm } from './lib/ensure-ts-esm.mts';

ensureTsEsm();

type Violation = {
  file: string;
  line: number;
  col: number;
  message: string;
};

const ROOT = process.cwd();
const TARGET_EXTENSIONS = new Set(['.ts', '.tsx', '.mts', '.cts']);
const TARGET_PREFIXES = [
  'app',
  'lib',
  'scripts',
  path.join('tests', 'guardrails'),
];
const FIXTURE_MODE = process.env['CHERRY_IMPLICIT_BOOLEAN_FIXTURE'] === '1';
const FIXTURE_PATH = path.join(ROOT, 'tests', 'fixtures', 'guardrails', 'no-implicit-boolean.ts');

const COMPARISON_OPERATORS = new Set<ts.SyntaxKind>([
  ts.SyntaxKind.EqualsEqualsToken,
  ts.SyntaxKind.EqualsEqualsEqualsToken,
  ts.SyntaxKind.ExclamationEqualsToken,
  ts.SyntaxKind.ExclamationEqualsEqualsToken,
  ts.SyntaxKind.LessThanToken,
  ts.SyntaxKind.LessThanEqualsToken,
  ts.SyntaxKind.GreaterThanToken,
  ts.SyntaxKind.GreaterThanEqualsToken,
  ts.SyntaxKind.InKeyword,
  ts.SyntaxKind.InstanceOfKeyword,
]);

function fail(message: string): never {
  process.stderr.write(`[no-implicit-boolean] ${message}\n`);
  process.exit(1);
}

function isTargetFile(fileName: string): boolean {
  const relative = path.relative(ROOT, fileName);
  if (relative.startsWith('..')) return false;
  const normalized = path.normalize(relative);
  if (!TARGET_EXTENSIONS.has(path.extname(normalized))) return false;
  return TARGET_PREFIXES.some((prefix) => {
    const normalizedPrefix = path.normalize(prefix);
    return normalized === normalizedPrefix || normalized.startsWith(`${normalizedPrefix}${path.sep}`);
  });
}

function isAlwaysBoolean(type: ts.Type): boolean {
  if (type.isUnion()) {
    return type.types.every((member) => isAlwaysBoolean(member));
  }
  if (type.isIntersection()) {
    return type.types.every((member) => isAlwaysBoolean(member));
  }
  return (type.flags & ts.TypeFlags.BooleanLike) !== 0;
}

function unwrapParens(expression: ts.Expression): ts.Expression {
  let current = expression;
  while (ts.isParenthesizedExpression(current)) {
    current = current.expression;
  }
  return current;
}

function isComparisonExpression(expression: ts.Expression): boolean {
  const unwrapped = unwrapParens(expression);
  if (!ts.isBinaryExpression(unwrapped)) return false;
  return COMPARISON_OPERATORS.has(unwrapped.operatorToken.kind);
}

function isAllowedCondition(expression: ts.Expression, checker: ts.TypeChecker): boolean {
  const unwrapped = unwrapParens(expression);
  if (ts.isPrefixUnaryExpression(unwrapped) && unwrapped.operator === ts.SyntaxKind.ExclamationToken) {
    return isAllowedCondition(unwrapped.operand, checker);
  }
  if (isComparisonExpression(unwrapped)) return true;
  const type = checker.getTypeAtLocation(unwrapped);
  return isAlwaysBoolean(type);
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

function isAssertOkCall(node: ts.CallExpression): boolean {
  if (!ts.isPropertyAccessExpression(node.expression)) return false;
  if (node.expression.name.text !== 'ok') return false;
  return node.expression.expression.getText() === 'assert';
}

function checkCondition(
  violations: Violation[],
  sourceFile: ts.SourceFile,
  checker: ts.TypeChecker,
  node: ts.Node,
  expression: ts.Expression,
  label: string
): void {
  if (isAllowedCondition(expression, checker)) return;
  const text = expression.getText(sourceFile);
  addViolation(
    violations,
    sourceFile,
    node,
    `${label} uses implicit boolean: ${text}`
  );
}

function scanSourceFile(sourceFile: ts.SourceFile, checker: ts.TypeChecker): Violation[] {
  const violations: Violation[] = [];

  function visit(node: ts.Node): void {
    if (ts.isIfStatement(node)) {
      checkCondition(violations, sourceFile, checker, node, node.expression, 'if');
    } else if (ts.isWhileStatement(node)) {
      checkCondition(violations, sourceFile, checker, node, node.expression, 'while');
    } else if (ts.isDoStatement(node)) {
      checkCondition(violations, sourceFile, checker, node, node.expression, 'do/while');
    } else if (ts.isForStatement(node)) {
      if (node.condition !== undefined) {
        checkCondition(violations, sourceFile, checker, node, node.condition, 'for');
      }
    } else if (ts.isCallExpression(node) && isAssertOkCall(node)) {
      const firstArg = node.arguments[0];
      if (firstArg !== undefined) {
        checkCondition(violations, sourceFile, checker, node, firstArg, 'assert.ok');
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return violations;
}

function resolveRootNames(): string[] {
  if (FIXTURE_MODE) {
    if (!ts.sys.fileExists(FIXTURE_PATH)) {
      fail(`Fixture not found: ${path.relative(ROOT, FIXTURE_PATH)}`);
    }
    return [FIXTURE_PATH];
  }

  const configPath = ts.findConfigFile(ROOT, ts.sys.fileExists, 'tsconfig.eslint.json');
  if (configPath === undefined) {
    fail('tsconfig.eslint.json not found');
  }
  const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
  if (configFile.error !== undefined) {
    fail(ts.formatDiagnosticsWithColorAndContext([configFile.error], {
      getCanonicalFileName: (fileName) => fileName,
      getCurrentDirectory: () => ROOT,
      getNewLine: () => '\n',
    }));
  }
  const parsed = ts.parseJsonConfigFileContent(
    configFile.config,
    ts.sys,
    path.dirname(configPath),
    { noEmit: true },
    configPath
  );
  if (parsed.errors.length > 0) {
    fail(ts.formatDiagnosticsWithColorAndContext(parsed.errors, {
      getCanonicalFileName: (fileName) => fileName,
      getCurrentDirectory: () => ROOT,
      getNewLine: () => '\n',
    }));
  }
  return parsed.fileNames;
}

function resolveCompilerOptions(): ts.CompilerOptions {
  if (FIXTURE_MODE) {
    return {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      strict: true,
      jsx: ts.JsxEmit.ReactJSX,
    };
  }
  const configPath = ts.findConfigFile(ROOT, ts.sys.fileExists, 'tsconfig.eslint.json');
  if (configPath === undefined) {
    fail('tsconfig.eslint.json not found');
  }
  const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
  if (configFile.error !== undefined) {
    fail(ts.formatDiagnosticsWithColorAndContext([configFile.error], {
      getCanonicalFileName: (fileName) => fileName,
      getCurrentDirectory: () => ROOT,
      getNewLine: () => '\n',
    }));
  }
  const parsed = ts.parseJsonConfigFileContent(
    configFile.config,
    ts.sys,
    path.dirname(configPath),
    { noEmit: true },
    configPath
  );
  return parsed.options;
}

function main(): void {
  const rootNames = resolveRootNames();
  const options = resolveCompilerOptions();
  const program = ts.createProgram({ rootNames, options });
  const checker = program.getTypeChecker();

  const violations: Violation[] = [];
  for (const sourceFile of program.getSourceFiles()) {
    if (sourceFile.isDeclarationFile) continue;
    if (FIXTURE_MODE) {
      if (path.resolve(sourceFile.fileName) !== path.resolve(FIXTURE_PATH)) continue;
    } else if (!isTargetFile(sourceFile.fileName)) {
      continue;
    }
    violations.push(...scanSourceFile(sourceFile, checker));
  }

  if (violations.length > 0) {
    for (const violation of violations) {
      process.stderr.write(
        `${violation.file}:${violation.line}:${violation.col}: ${violation.message}\n`
      );
    }
    process.exit(1);
  }

  process.stdout.write('no-implicit-boolean: ok\n');
}

main();
