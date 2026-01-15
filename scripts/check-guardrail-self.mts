import * as fs from 'node:fs';
import * as path from 'node:path';
import ts from 'typescript';
import { ensureTsEsm } from './lib/ensure-ts-esm.mjs';
import { asMessage } from './guardrails/lib/error.mjs';
import { fail } from './guardrails/lib/fail.mjs';
import { BRAND_PROPERTIES } from '../lib/util/brand-registry.js';

ensureTsEsm();

type Violation = {
  file: string;
  line: number;
  col: number;
  message: string;
};

const ROOT = process.cwd();
const PREFIX = 'check:guardrail-self';
const FIXTURE_MODE = process.env['CHERRY_GUARDRAIL_SELF_FIXTURE'] === '1';
const FIXTURE_PATH = path.join(
  ROOT,
  'tests',
  'fixtures',
  'guardrails',
  'guardrail-self-consistency.ts'
);
const GUARDRAIL_HELPER_DIR = path.join(ROOT, 'scripts', 'guardrails', 'lib');
const REQUIRED_HELPERS = new Set([
  'fail.mts',
  'error.mts',
  'read-json.mts',
  'import-typed.mts',
  'run-tool.mts',
]);
const POLICY_FIELD_NAMES = new Set(['tier', 'timestampSource', 'expiresBy', 'source']);
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

const DEFAULT_FIX = 'Fix guardrail scripts to satisfy the self-consistency checks.';

function guardrailFail(message: string, fix: string = DEFAULT_FIX): never {
  fail(PREFIX, message, { fix });
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

function isGuardrailScript(fileName: string): boolean {
  const relative = path.relative(ROOT, fileName);
  if (relative.startsWith('..')) return false;
  const normalized = path.normalize(relative);
  if (!normalized.startsWith(`scripts${path.sep}`)) return false;
  const base = path.basename(normalized);
  if (!base.startsWith('check-')) return false;
  return base.endsWith('.mts') || base.endsWith('.ts');
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

function isAlwaysBoolean(type: ts.Type): boolean {
  if (type.isUnion()) {
    return type.types.every((member) => isAlwaysBoolean(member));
  }
  if (type.isIntersection()) {
    return type.types.every((member) => isAlwaysBoolean(member));
  }
  return (type.flags & ts.TypeFlags.BooleanLike) !== 0;
}

function isAllowedCondition(expression: ts.Expression, checker: ts.TypeChecker): boolean {
  const unwrapped = unwrapParens(expression);
  if (
    ts.isPrefixUnaryExpression(unwrapped) === true &&
    unwrapped.operator === ts.SyntaxKind.ExclamationToken
  ) {
    return isAllowedCondition(unwrapped.operand, checker);
  }
  if (isComparisonExpression(unwrapped)) return true;
  const type = checker.getTypeAtLocation(unwrapped);
  return isAlwaysBoolean(type);
}

function isLiteralExpression(expression: ts.Expression): boolean {
  if (ts.isStringLiteral(expression) === true) return true;
  if (ts.isNoSubstitutionTemplateLiteral(expression) === true) return true;
  if (ts.isNumericLiteral(expression) === true) return true;
  if (
    ts.isPrefixUnaryExpression(expression) === true &&
    ts.isNumericLiteral(expression.operand) === true
  ) {
    return true;
  }
  return false;
}

function hasBrandProperty(type: ts.Type): boolean {
  if (type.isUnion()) {
    return type.types.some((member) => hasBrandProperty(member));
  }
  if (type.isIntersection()) {
    return type.types.some((member) => hasBrandProperty(member));
  }
  return type
    .getProperties()
    .some((prop) => BRAND_PROPERTIES.includes(prop.getName() as (typeof BRAND_PROPERTIES)[number]));
}

function isBroadString(type: ts.Type): boolean {
  if (type.isUnion()) {
    return type.types.some((member) => isBroadString(member));
  }
  if (type.isIntersection()) {
    return type.types.some((member) => isBroadString(member));
  }
  const isString = (type.flags & ts.TypeFlags.String) !== 0;
  const isLiteral = (type.flags & ts.TypeFlags.StringLiteral) !== 0;
  return isString && !isLiteral;
}

function checkImplicitBoolean(
  violations: Violation[],
  sourceFile: ts.SourceFile,
  checker: ts.TypeChecker,
  node: ts.Node,
  expression: ts.Expression,
  label: string
): void {
  if (isAllowedCondition(expression, checker)) return;
  const text = expression.getText(sourceFile);
  addViolation(violations, sourceFile, node, `${label} uses implicit boolean: ${text}`);
}

function checkAnyTypeNode(
  violations: Violation[],
  sourceFile: ts.SourceFile,
  node: ts.Node
): void {
  addViolation(violations, sourceFile, node, 'any is forbidden in guardrail scripts');
}

function checkDateNow(
  violations: Violation[],
  sourceFile: ts.SourceFile,
  node: ts.Node
): void {
  addViolation(violations, sourceFile, node, 'Date.now/new Date/performance.now are forbidden');
}

function checkBrandedLiteral(
  violations: Violation[],
  sourceFile: ts.SourceFile,
  node: ts.Node,
  targetType: ts.Type | undefined,
  initializer: ts.Expression
): void {
  if (!isLiteralExpression(initializer)) return;
  if (targetType === undefined) return;
  if (!hasBrandProperty(targetType)) return;
  addViolation(
    violations,
    sourceFile,
    node,
    'Branded type assigned from literal; use a constructor'
  );
}

function checkPolicyLiteral(
  violations: Violation[],
  sourceFile: ts.SourceFile,
  node: ts.Node,
  targetType: ts.Type | undefined,
  name: string,
  initializer: ts.Expression
): void {
  if (!POLICY_FIELD_NAMES.has(name)) return;
  if (!isLiteralExpression(initializer)) return;
  if (targetType === undefined) return;
  if (!isBroadString(targetType)) return;
  addViolation(
    violations,
    sourceFile,
    node,
    `Policy field ${name} must not be plain string`
  );
}

function scanSourceFile(sourceFile: ts.SourceFile, checker: ts.TypeChecker): Violation[] {
  const violations: Violation[] = [];

  function visit(node: ts.Node): void {
    if (ts.isIfStatement(node) === true) {
      checkImplicitBoolean(violations, sourceFile, checker, node, node.expression, 'if');
    } else if (ts.isWhileStatement(node) === true) {
      checkImplicitBoolean(violations, sourceFile, checker, node, node.expression, 'while');
    } else if (ts.isDoStatement(node) === true) {
      checkImplicitBoolean(violations, sourceFile, checker, node, node.expression, 'do/while');
    } else if (ts.isForStatement(node) === true) {
      if (node.condition !== undefined) {
        checkImplicitBoolean(violations, sourceFile, checker, node, node.condition, 'for');
      }
    } else if (node.kind === ts.SyntaxKind.AnyKeyword) {
      checkAnyTypeNode(violations, sourceFile, node);
    } else if (ts.isAsExpression(node) === true) {
      if (node.type.kind === ts.SyntaxKind.AnyKeyword) {
        addViolation(violations, sourceFile, node, 'as any is forbidden in guardrail scripts');
      }
      if (
        ts.isAsExpression(node.expression) === true &&
        node.expression.type.kind === ts.SyntaxKind.UnknownKeyword
      ) {
        addViolation(violations, sourceFile, node, 'as unknown as is forbidden in guardrail scripts');
      }
    } else if (ts.isTypeAssertionExpression(node) === true) {
      if (node.type.kind === ts.SyntaxKind.AnyKeyword) {
        addViolation(violations, sourceFile, node, 'as any is forbidden in guardrail scripts');
      }
    } else if (ts.isCallExpression(node) === true) {
      if (ts.isPropertyAccessExpression(node.expression) === true) {
        const expr = node.expression;
        if (
          ts.isIdentifier(expr.expression) === true &&
          expr.expression.text === 'Date' &&
          expr.name.text === 'now'
        ) {
          checkDateNow(violations, sourceFile, node);
        }
        if (
          ts.isIdentifier(expr.expression) === true &&
          expr.expression.text === 'performance' &&
          expr.name.text === 'now'
        ) {
          checkDateNow(violations, sourceFile, node);
        }
      }
    } else if (ts.isNewExpression(node) === true) {
      if (ts.isIdentifier(node.expression) === true && node.expression.text === 'Date') {
        checkDateNow(violations, sourceFile, node);
      }
    } else if (ts.isVariableDeclaration(node) === true) {
      const hasInitializer =
        node.initializer !== undefined && node.initializer !== null;
      if (hasInitializer) {
        const targetType = checker.getTypeAtLocation(node.name);
        checkBrandedLiteral(violations, sourceFile, node, targetType, node.initializer);
        if (ts.isIdentifier(node.name) === true) {
          checkPolicyLiteral(
            violations,
            sourceFile,
            node,
            targetType,
            node.name.text,
            node.initializer
          );
        }
      }
      if (node.type !== undefined && node.type.kind === ts.SyntaxKind.AnyKeyword) {
        checkAnyTypeNode(violations, sourceFile, node);
      }
    } else if (
      ts.isBinaryExpression(node) === true &&
      node.operatorToken.kind === ts.SyntaxKind.EqualsToken
    ) {
      const targetType = checker.getTypeAtLocation(node.left);
      checkBrandedLiteral(violations, sourceFile, node, targetType, node.right);
      if (ts.isIdentifier(node.left) === true) {
        checkPolicyLiteral(
          violations,
          sourceFile,
          node,
          targetType,
          node.left.text,
          node.right
        );
      } else if (ts.isPropertyAccessExpression(node.left) === true) {
        checkPolicyLiteral(
          violations,
          sourceFile,
          node,
          targetType,
          node.left.name.text,
          node.right
        );
      }
    } else if (ts.isPropertyAssignment(node) === true) {
      const contextual = checker.getContextualType(node.initializer);
      if (contextual !== undefined) {
        checkBrandedLiteral(violations, sourceFile, node, contextual, node.initializer);
      }
      if (ts.isIdentifier(node.name) === true) {
        checkPolicyLiteral(
          violations,
          sourceFile,
          node,
          contextual,
          node.name.text,
          node.initializer
        );
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
      guardrailFail(`Fixture not found: ${path.relative(ROOT, FIXTURE_PATH)}`);
    }
    return [FIXTURE_PATH];
  }
  const configPath = ts.findConfigFile(ROOT, ts.sys.fileExists, 'tsconfig.eslint.json');
  if (configPath === undefined) {
    guardrailFail('tsconfig.eslint.json not found');
  }
  const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
  if (configFile.error !== undefined) {
    guardrailFail(ts.formatDiagnosticsWithColorAndContext([configFile.error], {
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
    guardrailFail(ts.formatDiagnosticsWithColorAndContext(parsed.errors, {
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
    guardrailFail('tsconfig.eslint.json not found');
  }
  const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
  if (configFile.error !== undefined) {
    guardrailFail(ts.formatDiagnosticsWithColorAndContext([configFile.error], {
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

function assertGuardrailHelpers(): void {
  if (fs.existsSync(GUARDRAIL_HELPER_DIR) === false) {
    guardrailFail('Guardrail helper directory missing', 'Create scripts/guardrails/lib.');
  }
  const entries = fs.readdirSync(GUARDRAIL_HELPER_DIR, { withFileTypes: true });
  const files = entries.filter((entry) => entry.isFile()).map((entry) => entry.name);
  const missing = [...REQUIRED_HELPERS].filter((name) => !files.includes(name));
  const extra = files.filter((name) => !REQUIRED_HELPERS.has(name));
  if (missing.length === 0 && extra.length === 0) return;
  const details = [
    ...missing.map((name) => `${path.join('scripts', 'guardrails', 'lib', name)}:1:1: missing`),
    ...extra.map((name) => `${path.join('scripts', 'guardrails', 'lib', name)}:1:1: unexpected`),
  ];
  fail(PREFIX, 'Guardrail helper set mismatch', {
    details,
    fix: 'Keep only fail.mts, error.mts, read-json.mts, and import-typed.mts in scripts/guardrails/lib.',
  });
}

function main(): void {
  assertGuardrailHelpers();
  const rootNames = resolveRootNames();
  const options = resolveCompilerOptions();
  const program = ts.createProgram({ rootNames, options });
  const checker = program.getTypeChecker();

  const violations: Violation[] = [];
  for (const sourceFile of program.getSourceFiles()) {
    if (sourceFile.isDeclarationFile) continue;
    if (FIXTURE_MODE) {
      if (path.resolve(sourceFile.fileName) !== path.resolve(FIXTURE_PATH)) continue;
    } else if (!isGuardrailScript(sourceFile.fileName)) {
      continue;
    }
    violations.push(...scanSourceFile(sourceFile, checker));
  }

  if (violations.length > 0) {
    const details = violations.map(
      (violation) => `${violation.file}:${violation.line}:${violation.col}: ${violation.message}`
    );
    fail(PREFIX, 'Guardrail self-consistency violations detected', {
      details,
      fix: DEFAULT_FIX,
    });
  }

  process.stdout.write('guardrail-self-consistency: ok\n');
}

try {
  main();
} catch (error: unknown) {
  const message = asMessage(error);
  fail(PREFIX, `Guardrail crashed: ${message}`, { fix: DEFAULT_FIX });
}
