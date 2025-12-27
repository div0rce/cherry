import path from 'node:path';
import ts from 'typescript';
import { ensureTsEsm } from './lib/ensure-ts-esm.mts';
import { BRAND_CONSTRUCTORS, BRAND_PROPERTIES } from '../lib/util/brand-registry';

ensureTsEsm();

type Violation = {
  file: string;
  line: number;
  col: number;
  message: string;
};

const ROOT = process.cwd();
const TARGET_EXTENSIONS = new Set(['.ts', '.tsx', '.mts', '.cts']);
const TARGET_PREFIXES = ['app', 'lib', 'scripts', 'tests'];
const FIXTURE_DIR = path.join('tests', 'fixtures');
const FIXTURE_MODE = process.env['CHERRY_BRANDED_LITERAL_FIXTURE'] === '1';
const FIXTURE_PATH = path.join(
  ROOT,
  'tests',
  'fixtures',
  'guardrails',
  'branded-type-enforcement.ts'
);

function fail(message: string): never {
  process.stderr.write(`[no-branded-literal] ${message}\n`);
  process.exit(1);
}

function isTargetFile(fileName: string): boolean {
  const relative = path.relative(ROOT, fileName);
  if (relative.startsWith('..')) return false;
  const normalized = path.normalize(relative);
  if (!TARGET_EXTENSIONS.has(path.extname(normalized))) return false;
  if (normalized.startsWith(path.normalize(FIXTURE_DIR))) return false;
  return TARGET_PREFIXES.some((prefix) => {
    const normalizedPrefix = path.normalize(prefix);
    return normalized === normalizedPrefix || normalized.startsWith(`${normalizedPrefix}${path.sep}`);
  });
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

function isLiteralExpression(expression: ts.Expression): boolean {
  if (ts.isStringLiteral(expression)) return true;
  if (ts.isNoSubstitutionTemplateLiteral(expression)) return true;
  if (ts.isNumericLiteral(expression)) return true;
  if (ts.isPrefixUnaryExpression(expression) && ts.isNumericLiteral(expression.operand)) {
    return true;
  }
  return false;
}

function isBrandConstructorCall(expression: ts.Expression): boolean {
  if (!ts.isCallExpression(expression)) return false;
  if (ts.isIdentifier(expression.expression)) {
    return BRAND_CONSTRUCTORS.includes(
      expression.expression.text as (typeof BRAND_CONSTRUCTORS)[number]
    );
  }
  return false;
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

function scanSourceFile(sourceFile: ts.SourceFile, checker: ts.TypeChecker): Violation[] {
  const violations: Violation[] = [];

  function checkLiteral(
    node: ts.Node,
    targetType: ts.Type | undefined,
    initializer: ts.Expression
  ): void {
    if (!isLiteralExpression(initializer)) return;
    if (isBrandConstructorCall(initializer)) return;
    if (targetType === undefined) return;
    if (!hasBrandProperty(targetType)) return;
    addViolation(
      violations,
      sourceFile,
      node,
      `Branded type assigned from literal; use a constructor`
    );
  }

  function visit(node: ts.Node): void {
    if (
      ts.isVariableDeclaration(node) &&
      node.initializer !== undefined &&
      node.initializer !== null
    ) {
      const targetType = checker.getTypeAtLocation(node.name);
      checkLiteral(node, targetType, node.initializer);
    } else if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
      const targetType = checker.getTypeAtLocation(node.left);
      checkLiteral(node, targetType, node.right);
    } else if (ts.isPropertyAssignment(node)) {
      const contextual = checker.getContextualType(node.initializer);
      if (contextual !== undefined) {
        checkLiteral(node, contextual, node.initializer);
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

  process.stdout.write('no-branded-literal: ok\n');
}

main();
