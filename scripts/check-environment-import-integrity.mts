import * as fs from 'node:fs';
import * as path from 'node:path';
import fg from 'fast-glob';
import ts from 'typescript';
import { ensureTsEsm } from './lib/ensure-ts-esm.mjs';
import { asMessage } from './guardrails/lib/error.mjs';
import { fail } from './guardrails/lib/fail.mjs';
import {
  ENVIRONMENT_CONTRACTS,
  ENVIRONMENT_IGNORE_GLOBS,
  ENVIRONMENT_SCAN_GLOBS,
  NODE_BUILTIN_ROOTS,
  type EnvironmentName,
} from './guardrails/lib/environment-contract.mjs';

ensureTsEsm();

const PREFIX = 'check:environment-import-integrity';
const ROOT = process.cwd();
const FIX =
  'Assign every source file to exactly one environment in scripts/guardrails/lib/environment-contract.mts and repair cross-environment imports.';

const ENV_NAMES = Object.keys(ENVIRONMENT_CONTRACTS) as EnvironmentName[];
const NODE_BUILTIN_ROOT_SET = new Set(NODE_BUILTIN_ROOTS);

type Env = EnvironmentName;

type ImportRef = {
  specifier: string;
  line: number;
  col: number;
  kind: string;
};

const REQUIRE_IDENTIFIERS = new Set(['require', 'requireModule', 'requireFn']);

const EXTENSIONS = [
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mts',
  '.cts',
  '.mjs',
  '.cjs',
] as const;

function normalizePath(filePath: string): string {
  return filePath.split(path.sep).join('/');
}

function envIdFor(env: Env): string {
  return ENVIRONMENT_CONTRACTS[env].id;
}

function isNodeBuiltinSpecifier(specifier: string): boolean {
  if (specifier.startsWith('node:')) return true;
  const cleaned = specifier.startsWith('node:') ? specifier.slice('node:'.length) : specifier;
  const root = cleaned.split('/')[0] ?? cleaned;
  return NODE_BUILTIN_ROOT_SET.has(cleaned) || NODE_BUILTIN_ROOT_SET.has(root);
}

function buildOwnershipIndex(files: string[]): Map<string, Env[]> {
  const scanSet = new Set(files);
  const matches = new Map<string, Env[]>();

  for (const env of ENV_NAMES) {
    const contract = ENVIRONMENT_CONTRACTS[env];
    const exclude =
      'exclude' in contract.ownership ? contract.ownership.exclude ?? [] : [];
    const ignore = [...ENVIRONMENT_IGNORE_GLOBS, ...exclude];
    const envFiles = fg.sync(contract.ownership.include, {
      cwd: ROOT,
      ignore,
      onlyFiles: true,
    });

    for (const relPath of envFiles.map(normalizePath)) {
      if (!scanSet.has(relPath)) continue;
      const current = matches.get(relPath);
      if (current !== undefined) {
        if (!current.includes(env)) {
          current.push(env);
        }
      } else {
        matches.set(relPath, [env]);
      }
    }
  }

  return matches;
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
  node: ts.Node,
  kind: string
): void {
  const { line, col } = positionFor(sourceFile, node);
  imports.push({ specifier, line, col, kind });
}

function collectImports(sourceFile: ts.SourceFile): ImportRef[] {
  const imports: ImportRef[] = [];

  const visit = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node)) {
      if (node.importClause?.isTypeOnly === true) {
        ts.forEachChild(node, visit);
        return;
      }
      if (ts.isStringLiteralLike(node.moduleSpecifier)) {
        addImport(imports, sourceFile, node.moduleSpecifier.text, node, 'import');
      }
    } else if (ts.isExportDeclaration(node) && node.moduleSpecifier !== undefined) {
      if (node.isTypeOnly === true) {
        ts.forEachChild(node, visit);
        return;
      }
      if (ts.isStringLiteralLike(node.moduleSpecifier)) {
        addImport(imports, sourceFile, node.moduleSpecifier.text, node, 'export');
      }
    } else if (ts.isImportEqualsDeclaration(node)) {
      const ref = node.moduleReference;
      if (ts.isExternalModuleReference(ref) && ts.isStringLiteralLike(ref.expression)) {
        addImport(imports, sourceFile, ref.expression.text, node, 'import=');
      }
    } else if (ts.isCallExpression(node)) {
      if (node.expression.kind === ts.SyntaxKind.ImportKeyword) {
        const arg = node.arguments[0];
        if (arg !== undefined && ts.isStringLiteralLike(arg)) {
          addImport(imports, sourceFile, arg.text, node, 'dynamic-import');
        }
      } else if (ts.isIdentifier(node.expression)) {
        if (REQUIRE_IDENTIFIERS.has(node.expression.text)) {
          const arg = node.arguments[0];
          if (arg !== undefined && ts.isStringLiteralLike(arg)) {
            addImport(imports, sourceFile, arg.text, node, 'require');
          }
        }
      } else if (ts.isPropertyAccessExpression(node.expression)) {
        const expr = node.expression.expression;
        const name = node.expression.name;
        if (ts.isIdentifier(expr) && ts.isIdentifier(name) && name.text === 'resolve') {
          if (REQUIRE_IDENTIFIERS.has(expr.text)) {
            const arg = node.arguments[0];
            if (arg !== undefined && ts.isStringLiteralLike(arg)) {
              addImport(imports, sourceFile, arg.text, node, 'require-resolve');
            }
          }
        }
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return imports;
}

function isRelative(specifier: string): boolean {
  return specifier.startsWith('./') || specifier.startsWith('../');
}

function isRootAlias(specifier: string): boolean {
  return specifier.startsWith('@/');
}

function isUiAlias(specifier: string): boolean {
  return specifier.startsWith('@ui/');
}

function buildCandidates(absPath: string): string[] {
  const candidates: string[] = [];
  const ext = path.extname(absPath);
  if (ext.length > 0) {
    candidates.push(absPath);
    if (ext === '.js' || ext === '.mjs' || ext === '.cjs') {
      const base = absPath.slice(0, -ext.length);
      candidates.push(
        `${base}.ts`,
        `${base}.tsx`,
        `${base}.mts`,
        `${base}.cts`
      );
    }
  } else {
    for (const extension of EXTENSIONS) {
      candidates.push(`${absPath}${extension}`);
    }
    for (const extension of EXTENSIONS) {
      candidates.push(path.join(absPath, `index${extension}`));
    }
  }
  return candidates;
}

function resolveCandidate(absPath: string): string | null {
  for (const candidate of buildCandidates(absPath)) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return normalizePath(path.relative(ROOT, candidate));
    }
  }
  return null;
}

function resolveInternalImport(fromRel: string, specifier: string): string | null {
  const fromAbs = path.resolve(ROOT, fromRel);
  const baseDir = path.dirname(fromAbs);

  if (isRelative(specifier)) {
    return resolveCandidate(path.resolve(baseDir, specifier));
  }

  if (isUiAlias(specifier)) {
    const rest = specifier.slice('@ui/'.length);
    return resolveCandidate(path.join(ROOT, 'components', 'ui', rest));
  }

  if (isRootAlias(specifier)) {
    const rest = specifier.slice('@/'.length);
    return resolveCandidate(path.join(ROOT, rest));
  }

  return null;
}

function isNextSpecifier(specifier: string): boolean {
  return specifier === 'next' || specifier.startsWith('next/');
}

function isReactSpecifier(specifier: string): boolean {
  return specifier === 'react' || specifier.startsWith('react/');
}

function isReactDomSpecifier(specifier: string): boolean {
  return specifier === 'react-dom' || specifier.startsWith('react-dom/');
}

const GUARDRAIL_RUNTIME_ALLOWLIST = [
  'lib/authority/',
  'lib/config/',
  'lib/engine/optimality/',
  'lib/adapters/',
  'lib/util/brand-registry.ts',
  'lib/util/iso-date.ts',
];

function isGuardrailRuntimeAllowed(resolved: string): boolean {
  return GUARDRAIL_RUNTIME_ALLOWLIST.some((prefix) => resolved.startsWith(prefix));
}

const NODE_TO_NEXT_ALLOWLIST = ['app/api/auth/[...nextauth]/route.'];

function isNodeToNextAllowed(resolved: string): boolean {
  return NODE_TO_NEXT_ALLOWLIST.some((prefix) => resolved.startsWith(prefix));
}

function allowedEdge(fromEnv: Env, toEnv: Env): boolean {
  const allowed = ENVIRONMENT_CONTRACTS[fromEnv].allowedImportsFrom as readonly Env[];
  return allowed.includes(toEnv);
}

async function main(): Promise<void> {
  const files = fg.sync(ENVIRONMENT_SCAN_GLOBS, {
    cwd: ROOT,
    ignore: ENVIRONMENT_IGNORE_GLOBS,
    onlyFiles: true,
  });

  const sortedFiles = files.map(normalizePath).sort();
  if (sortedFiles.length === 0) {
    fail(PREFIX, 'No source files found for environment scan', { fix: FIX });
  }

  const envByFile = new Map<string, Env>();
  const ownershipViolations: string[] = [];
  const ownershipIndex = buildOwnershipIndex(sortedFiles);

  for (const relPath of sortedFiles) {
    const matches = ownershipIndex.get(relPath) ?? [];
    if (matches.length !== 1) {
      const label =
        matches.length === 0
          ? 'unowned'
          : `ambiguous (${matches.map(envIdFor).join(', ')})`;
      ownershipViolations.push(`${relPath}:1:1: environment ownership ${label}`);
      continue;
    }
    const match = matches[0];
    if (match === undefined) {
      continue;
    }
    envByFile.set(relPath, match);
  }

  if (ownershipViolations.length > 0) {
    fail(PREFIX, 'Environment ownership violations detected', {
      details: ownershipViolations,
      fix: FIX,
    });
  }

  const violations: string[] = [];

  for (const relPath of sortedFiles) {
    const env = envByFile.get(relPath);
    if (env === undefined) continue;

    const absPath = path.join(ROOT, relPath);
    let content: string;
    try {
      content = fs.readFileSync(absPath, 'utf8');
    } catch (err: unknown) {
      const message = asMessage(err);
      fail(PREFIX, `Failed to read ${relPath}: ${message}`, { fix: FIX });
      return;
    }

    const sourceFile = ts.createSourceFile(
      relPath,
      content,
      ts.ScriptTarget.ESNext,
      true,
      scriptKindFor(relPath)
    );
    const imports = collectImports(sourceFile);

    for (const imp of imports) {
      const spec = imp.specifier;
      const resolved = resolveInternalImport(relPath, spec);

      if (resolved !== null) {
        const targetEnv = envByFile.get(resolved);
        if (targetEnv === undefined) {
          violations.push(
            `${relPath}:${imp.line}:${imp.col}: ${imp.kind} "${spec}" resolves to ${resolved} without environment ownership`
          );
          continue;
        }

        if (
          !allowedEdge(env, targetEnv) &&
          !(env === 'node' && targetEnv === 'next' && isNodeToNextAllowed(resolved))
        ) {
          violations.push(
            `${relPath}:${imp.line}:${imp.col}: ${envIdFor(env)} cannot import ${envIdFor(
              targetEnv
            )} (${spec})`
          );
        }

        if (relPath.startsWith('tests/node/') && targetEnv !== 'node') {
          violations.push(
            `${relPath}:${imp.line}:${imp.col}: tests/node may only import env:node (saw ${envIdFor(
              targetEnv
            )} via ${spec})`
          );
        }

        if (relPath.startsWith('tests/engine/') && targetEnv !== 'node') {
          violations.push(
            `${relPath}:${imp.line}:${imp.col}: tests/engine may only import env:node (saw ${envIdFor(
              targetEnv
            )} via ${spec})`
          );
        }

        if (relPath.startsWith('tests/db/') && targetEnv !== 'node') {
          violations.push(
            `${relPath}:${imp.line}:${imp.col}: tests/db may only import env:node (saw ${envIdFor(
              targetEnv
            )} via ${spec})`
          );
        }

        if (env === 'guardrail' && targetEnv === 'node' && !resolved.startsWith('scripts/')) {
          if (isGuardrailRuntimeAllowed(resolved)) {
            continue;
          }
          violations.push(
            `${relPath}:${imp.line}:${imp.col}: ${envIdFor(
              env
            )} may not import runtime modules (${spec} -> ${resolved})`
          );
        }

        if (relPath.startsWith('tests/node/') && isUiAlias(spec)) {
          violations.push(
            `${relPath}:${imp.line}:${imp.col}: tests/node may not import ${spec}`
          );
        }

        if (relPath.startsWith('tests/engine/') && isUiAlias(spec)) {
          violations.push(
            `${relPath}:${imp.line}:${imp.col}: tests/engine may not import ${spec}`
          );
        }

        continue;
      }

      if (env !== 'next' && env !== 'test') {
        if (isNextSpecifier(spec) || isReactSpecifier(spec) || isReactDomSpecifier(spec)) {
          violations.push(
            `${relPath}:${imp.line}:${imp.col}: ${envIdFor(env)} may not import ${spec}`
          );
        }
      }

      const allowNextNodeBuiltins =
        relPath.startsWith('app/api/') || relPath.startsWith('tests/next/');
      if (env === 'next' && isNodeBuiltinSpecifier(spec) && !allowNextNodeBuiltins) {
        violations.push(
          `${relPath}:${imp.line}:${imp.col}: ${envIdFor(
            env
          )} may not import Node builtins (${spec})`
        );
      }

      if (relPath.startsWith('tests/node/') && isUiAlias(spec)) {
        violations.push(
          `${relPath}:${imp.line}:${imp.col}: tests/node may not import ${spec}`
        );
      }

      if (relPath.startsWith('tests/engine/') && isUiAlias(spec)) {
        violations.push(
          `${relPath}:${imp.line}:${imp.col}: tests/engine may not import ${spec}`
        );
      }
    }
  }

  if (violations.length > 0) {
    fail(PREFIX, 'Environment import integrity violations detected', {
      details: violations,
      fix: FIX,
    });
  }

  process.stdout.write('check:environment-import-integrity: ok\n');
}

main().catch((error: unknown) => {
  const message = asMessage(error);
  fail(PREFIX, `Guardrail crashed: ${message}`, { fix: FIX });
});
