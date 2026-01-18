import * as fs from 'node:fs';
import * as path from 'node:path';
import fg from 'fast-glob';
import * as ts from 'typescript';
import { ensureTsEsm } from './lib/ensure-ts-esm.mjs';
import { fail } from './guardrails/lib/fail.mjs';

ensureTsEsm();

const ROOT = process.cwd();
const PREFIX = 'check:config-snapshot';
const SNAPSHOT_PATH = path.join(ROOT, 'docs', 'config-snapshot.md');
const FIX = 'Update docs/config-snapshot.md and align tsconfig policy enforcement.';

const STRICTNESS_KEYS = new Set([
  'strict',
  'noImplicitAny',
  'noImplicitThis',
  'strictNullChecks',
  'strictFunctionTypes',
  'strictBindCallApply',
  'noImplicitOverride',
  'noImplicitReturns',
  'noFallthroughCasesInSwitch',
  'noUnusedLocals',
  'noUnusedParameters',
  'noUncheckedIndexedAccess',
  'noPropertyAccessFromIndexSignature',
  'exactOptionalPropertyTypes',
  'useUnknownInCatchVariables',
]);

const INTEROP_KEYS = new Set([
  'esModuleInterop',
  'allowSyntheticDefaultImports',
  'resolveJsonModule',
]);

const ITERATION_KEYS = new Set(['downlevelIteration']);
const MODULE_KEYS = new Set(['module', 'moduleResolution', 'verbatimModuleSyntax']);

const OTHER_CONFIG_FILES = [
  '.gitignore',
  '.nvmrc',
  'package.json',
  'package-lock.json',
  'eslint.config.mjs',
  'next.config.ts',
  'tailwind.config.ts',
  'postcss.config.mjs',
  'prisma/migrations/migration_lock.toml',
  'prisma/schema.prisma',
  'scripts/execution/registry.mts',
  'scripts/guardrails/migration-safety.baseline.json',
  'scripts/guardrails/registry.mts',
  'scripts/guardrails/server-entropy.allowlist.json',
  'scripts/side-effects.allowlist.json',
];

const ALLOWED_SCRIPT_CONFIGS = new Set([
  'tsconfig.scripts.json',
  'tsconfig.scripts.typecheck.json',
  'scripts/tsconfig.json',
  'prisma/scripts/tsconfig.json',
]);

function normalizePath(input: string): string {
  return input.split(path.sep).join('/');
}

function normalizeText(input: string): string {
  const normalized = input.replace(/\r\n/g, '\n');
  return normalized.endsWith('\n') ? normalized.slice(0, -1) : normalized;
}

function isFixturePath(filePath: string): boolean {
  return filePath.startsWith('tests/fixtures/');
}

function isScriptConfig(filePath: string): boolean {
  if (ALLOWED_SCRIPT_CONFIGS.has(filePath)) return true;
  return filePath.startsWith('scripts/') || filePath.startsWith('prisma/scripts/');
}

function ensure(condition: boolean, message: string): void {
  if (!condition) {
    fail(PREFIX, message, { fix: FIX });
  }
}

function readTsconfig(filePath: string): Record<string, unknown> {
  const absolute = path.join(ROOT, filePath);
  const result = ts.readConfigFile(absolute, ts.sys.readFile);
  if (result.error !== undefined) {
    const text = ts.flattenDiagnosticMessageText(result.error.messageText, '\n');
    fail(PREFIX, `Failed to read ${filePath}: ${text}`, { fix: FIX });
  }
  const configValue = result.config as unknown;
  if (typeof configValue === 'object' && configValue !== null) {
    return configValue as Record<string, unknown>;
  }
  return {};
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === 'string');
}

function parseSnapshotBlocks(snapshotText: string): Map<string, string> {
  const blocks = new Map<string, string>();
  const duplicates = new Set<string>();
  const lines = snapshotText.split(/\r?\n/);
  let inBlock = false;
  let current: string[] = [];

  const finalize = () => {
    if (current.length === 0) return;
    const firstIndex = current.findIndex((line) => line.trim().length > 0);
    if (firstIndex === -1) {
      current = [];
      return;
    }
    const markerLine = current[firstIndex];
    if (markerLine === undefined) {
      current = [];
      return;
    }
    const marker = markerLine.trim();
    if (marker.length === 0) {
      current = [];
      return;
    }
    if (!marker.startsWith('//') && !marker.startsWith('#')) {
      current = [];
      return;
    }
    const filePath = normalizePath(
      marker.replace(/^\/\/+\s*/, '').replace(/^#\s*/, '').replace(/^\/+\s*/, '').trim()
    );
    if (filePath.length === 0 || /\s/.test(filePath)) {
      current = [];
      return;
    }
    const bodyLines = current.slice(firstIndex + 1);
    const body = normalizeText(bodyLines.join('\n'));
    if (blocks.has(filePath)) {
      duplicates.add(filePath);
    } else {
      blocks.set(filePath, body);
    }
    current = [];
  };

  for (const line of lines) {
    if (line.trim().startsWith('```')) {
      if (inBlock) {
        finalize();
        inBlock = false;
      } else {
        inBlock = true;
      }
      continue;
    }
    if (inBlock) {
      current.push(line);
    }
  }

  if (inBlock) {
    finalize();
  }

  if (duplicates.size > 0) {
    fail(PREFIX, `Config snapshot contains duplicate entries: ${[...duplicates].join(', ')}`, { fix: FIX });
  }

  return blocks;
}

function checkSnapshot(configFiles: Set<string>): void {
  if (!fs.existsSync(SNAPSHOT_PATH)) {
    fail(PREFIX, 'docs/config-snapshot.md is missing', { fix: FIX });
  }
  const snapshotText = fs.readFileSync(SNAPSHOT_PATH, 'utf8');
  const snapshotBlocks = parseSnapshotBlocks(snapshotText);
  const snapshotPaths = new Set(snapshotBlocks.keys());

  for (const configFile of configFiles) {
    ensure(snapshotPaths.has(configFile), `Missing ${configFile} in docs/config-snapshot.md.`);
  }

  for (const snapshotPath of snapshotPaths) {
    if (!configFiles.has(snapshotPath) && !isFixturePath(snapshotPath)) {
      fail(PREFIX, `docs/config-snapshot.md lists unexpected config: ${snapshotPath}`, { fix: FIX });
    }
    const absolute = path.join(ROOT, snapshotPath);
    if (!fs.existsSync(absolute)) {
      fail(PREFIX, `Config listed in snapshot does not exist: ${snapshotPath}`, { fix: FIX });
    }
  }

  for (const snapshotPath of snapshotPaths) {
    const snapshotBody = snapshotBlocks.get(snapshotPath);
    if (snapshotBody === undefined) continue;
    const fileBody = normalizeText(fs.readFileSync(path.join(ROOT, snapshotPath), 'utf8'));
    if (fileBody !== snapshotBody) {
      fail(PREFIX, `Config snapshot drift detected for ${snapshotPath}`, { fix: FIX });
    }
  }
}

function checkNextConfigOutputTraceExcludes(): void {
  const nextConfigPath = path.join(ROOT, 'next.config.ts');
  const nextConfig = fs.readFileSync(nextConfigPath, 'utf8');
  const sourceFile = ts.createSourceFile(
    nextConfigPath,
    nextConfig,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS
  );
  const requiredExcludes = new Set(['.next/export-detail.json', '.next/lock']);
  const missing = findMissingOutputTraceExcludes(sourceFile, requiredExcludes);
  if (missing.length > 0) {
    fail(
      PREFIX,
      `next.config.ts must exclude ${missing.join(', ')} from output tracing.`,
      {
        fix: `Add outputFileTracingExcludes with ${missing.join(', ')} to next.config.ts.`,
      }
    );
  }
}

function findMissingOutputTraceExcludes(
  sourceFile: ts.SourceFile,
  required: Set<string>
): string[] {
  const found = new Set<string>();

  const collectLiterals = (node: ts.Node): void => {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      found.add(node.text);
      return;
    }
    ts.forEachChild(node, collectLiterals);
  };

  const visit = (node: ts.Node): void => {
    if (ts.isPropertyAssignment(node)) {
      const name = node.name;
      const isMatch =
        (ts.isIdentifier(name) && name.text === 'outputFileTracingExcludes') ||
        (ts.isStringLiteral(name) && name.text === 'outputFileTracingExcludes');
      if (isMatch && ts.isObjectLiteralExpression(node.initializer)) {
        collectLiterals(node.initializer);
      }
    }
    ts.forEachChild(node, visit);
  };

  visit(sourceFile);

  return [...required].filter((entry) => !found.has(entry));
}

function checkTsconfigPolicies(tsconfigFiles: string[]): void {
  const baseConfig = readTsconfig('tsconfig.base.json');
  const baseCompilerOptionsValue = baseConfig['compilerOptions'];
  const baseCompilerOptions =
    typeof baseCompilerOptionsValue === 'object' && baseCompilerOptionsValue !== null
      ? (baseCompilerOptionsValue as Record<string, unknown>)
      : {};

  const authority = tsconfigFiles.filter((file) => file === 'tsconfig.base.json');
  ensure(authority.length === 1, 'Exactly one semantic authority (tsconfig.base.json) is required.');

  for (const file of tsconfigFiles) {
    if (isFixturePath(file)) continue;
    const config = readTsconfig(file);
    const compilerOptionsValue = config['compilerOptions'];
    const compilerOptions =
      typeof compilerOptionsValue === 'object' && compilerOptionsValue !== null
        ? (compilerOptionsValue as Record<string, unknown>)
        : {};

    const hasNodeNext =
      compilerOptions['module'] === 'NodeNext' ||
      compilerOptions['moduleResolution'] === 'NodeNext' ||
      compilerOptions['verbatimModuleSyntax'] === true;

    if (hasNodeNext && !isScriptConfig(file)) {
      fail(PREFIX, `NodeNext is not allowed outside scripts: ${file}`, { fix: FIX });
    }

    if (file === 'tsconfig.base.json') {
      continue;
    }

    for (const key of MODULE_KEYS) {
      if (compilerOptions[key] !== undefined && !isScriptConfig(file)) {
        if (compilerOptions[key] !== baseCompilerOptions[key]) {
          fail(PREFIX, `Module overrides must match tsconfig.base.json in ${file}.`, { fix: FIX });
        }
      }
    }

    for (const key of STRICTNESS_KEYS) {
      if (compilerOptions[key] !== undefined) {
        fail(PREFIX, `Strictness overrides are forbidden in ${file}.`, { fix: FIX });
      }
    }

    for (const key of INTEROP_KEYS) {
      if (compilerOptions[key] !== undefined) {
        fail(PREFIX, `Interop overrides are forbidden in ${file}.`, { fix: FIX });
      }
    }

    for (const key of ITERATION_KEYS) {
      if (compilerOptions[key] !== undefined) {
        fail(PREFIX, `Iteration semantics overrides are forbidden in ${file}.`, { fix: FIX });
      }
    }
  }
}

function checkEditorTsconfig(): void {
  const config = readTsconfig('tsconfig.json');
  ensure(
    config['extends'] === './tsconfig.base.json',
    'tsconfig.json must extend only tsconfig.base.json.'
  );
  ensure(config['references'] === undefined, 'tsconfig.json must not define project references.');

  const compilerOptionsValue = config['compilerOptions'];
  const compilerOptions =
    typeof compilerOptionsValue === 'object' && compilerOptionsValue !== null
      ? (compilerOptionsValue as Record<string, unknown>)
      : {};
  ensure(compilerOptions['noEmit'] === true, 'tsconfig.json must set compilerOptions.noEmit = true.');

  const exclude = toStringArray(config['exclude']);
  ensure(exclude.includes('tests/fixtures/**'), 'tsconfig.json must exclude tests/fixtures/**.');
}

function checkEslintTsconfig(): void {
  const eslintConfig = readTsconfig('tsconfig.eslint.json');
  ensure(
    eslintConfig['extends'] === './tsconfig.base.json',
    'tsconfig.eslint.json must extend only tsconfig.base.json.'
  );
  ensure(eslintConfig['references'] === undefined, 'tsconfig.eslint.json must not define references.');

  const eslintExclude = toStringArray(eslintConfig['exclude']);
  ensure(
    eslintExclude.some((entry) => entry === 'tests/fixtures' || entry === 'tests/fixtures/**'),
    'tsconfig.eslint.json must exclude tests/fixtures.'
  );

  const editorConfig = readTsconfig('tsconfig.json');
  const editorInclude = toStringArray(editorConfig['include']);
  const eslintInclude = toStringArray(eslintConfig['include']);

  for (const entry of eslintInclude) {
    const isCovered = editorInclude.some((editorEntry) =>
      entry === editorEntry || entry.startsWith(`${editorEntry}/`)
    );
    if (!isCovered) {
      fail(PREFIX, `tsconfig.eslint.json include '${entry}' is not covered by tsconfig.json.`, { fix: FIX });
    }
  }
}

function checkJsImportSpecifiers(): void {
  const files = fg.sync([
    'app/**/*.{ts,tsx,js,jsx,mts,cts}',
    'components/**/*.{ts,tsx,js,jsx,mts,cts}',
    'lib/**/*.{ts,tsx,js,jsx,mts,cts}',
    'tests/**/*.{ts,tsx,js,jsx,mts,cts}',
  ], {
    cwd: ROOT,
    dot: true,
    ignore: ['**/node_modules/**', '**/.next/**', 'tests/fixtures/**'],
  });

  const violations: Array<{ file: string; specifier: string }> = [];
  const requireToken = 'require';
  const specifierRegex = new RegExp(
    `(?:from\\s+|import\\s*\\(|${requireToken}(?:\\.resolve)?\\s*\\()\\s*['"]([^'"]+\\.js)['"]`,
    'g'
  );

  for (const file of files) {
    const absolute = path.join(ROOT, file);
    const content = fs.readFileSync(absolute, 'utf8');
    let match: RegExpExecArray | null;
    while ((match = specifierRegex.exec(content)) !== null) {
      const specifier = match[1] ?? '';
      if (specifier.length > 0) {
        violations.push({ file, specifier });
      }
    }
  }

  if (violations.length > 0) {
    const sample = violations
      .slice(0, 8)
      .map((entry) => `${entry.file}: ${entry.specifier}`)
      .join(', ');
    fail(
      PREFIX,
      `Disallowed .js import specifiers outside scripts: ${sample}`,
      { fix: 'Remove .js specifiers in app/components/lib/tests (allowed only in scripts).' }
    );
  }
}

function main(): void {
  const tsconfigFiles = fg.sync('**/tsconfig*.json', {
    cwd: ROOT,
    dot: true,
    ignore: ['**/node_modules/**', '**/.next/**', '**/dist/**', '**/build/**'],
  }).map((file) => normalizePath(file));

  const workflowFiles = fg.sync('.github/workflows/*.{yml,yaml}', {
    cwd: ROOT,
    dot: true,
    ignore: ['**/node_modules/**'],
  }).map((file) => normalizePath(file));

  const configFiles = new Set<string>([...OTHER_CONFIG_FILES, ...tsconfigFiles, ...workflowFiles]);

  checkSnapshot(configFiles);
  checkNextConfigOutputTraceExcludes();
  checkTsconfigPolicies(tsconfigFiles);
  checkEditorTsconfig();
  checkEslintTsconfig();
  checkJsImportSpecifiers();

  process.stdout.write('check:config-snapshot: ok\n');
}

main();
