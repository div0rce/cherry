import path from 'node:path';
import fg from 'fast-glob';
import ts from 'typescript';
import { ensureTsEsm } from './lib/ensure-ts-esm.mjs';
import { fail } from './guardrails/lib/fail.mjs';

ensureTsEsm();

const PREFIX = 'check:ts-coverage';
const FIX = 'Ensure every TS source is owned by exactly one tsconfig project.';
const ROOT_ENV = process.env['CHERRY_TS_COVERAGE_ROOT'];
const ROOT = ROOT_ENV !== undefined && ROOT_ENV !== '' ? path.resolve(ROOT_ENV) : process.cwd();
const SOURCE_GLOBS = [
  '**/*.ts',
  '**/*.tsx',
  '**/*.mts',
  '**/*.cts',
  '**/*.d.ts',
  '**/*.d.mts',
  '**/*.d.cts',
];
const IGNORE = [
  '**/node_modules/**',
  '**/.next/**',
  '**/dist/**',
  '**/dist-scripts/**',
  '**/build/**',
  '**/coverage/**',
  'tests/fixtures/**',
];
const CORE_CONFIG = path.join(ROOT, 'tsconfig.core.typecheck.json');
const APP_CONFIG = path.join(ROOT, 'tsconfig.app.typecheck.json');
const SCRIPTS_CONFIG = path.join(ROOT, 'tsconfig.scripts.typecheck.json');

type Owner = 'app' | 'scripts' | 'core' | 'unassigned';

type Violation = {
  file: string;
  issue: string;
  fix: string;
};

function normalize(filePath: string): string {
  return path.normalize(path.resolve(filePath));
}

function listProjectFiles(tsconfigPath: string, sourceSet: Set<string>): Set<string> {
  const read = ts.readConfigFile(tsconfigPath, ts.sys.readFile);
  if (read.error !== undefined) {
    const message = ts.flattenDiagnosticMessageText(read.error.messageText, '\n');
    fail(PREFIX, `Failed to read ${path.relative(ROOT, tsconfigPath)}: ${message}`, { fix: FIX });
  }
  const parsed = ts.parseJsonConfigFileContent(
    read.config,
    ts.sys,
    path.dirname(tsconfigPath),
  );
  const files = parsed.fileNames
    .map((filePath) => normalize(filePath))
    .filter((filePath) => sourceSet.has(filePath));
  if (files.length === 0) {
    fail(PREFIX, `No files found for ${path.relative(ROOT, tsconfigPath)}`, { fix: FIX });
  }
  return new Set(files);
}

function expectedOwner(relativePath: string): Owner {
  if (relativePath.startsWith('scripts/') || relativePath.startsWith('prisma/scripts/')) {
    return 'scripts';
  }
  if (
    relativePath.startsWith('app/') ||
    relativePath.startsWith('components/') ||
    relativePath.startsWith('lib/') ||
    relativePath.startsWith('tests/') ||
    relativePath === 'middleware.ts' ||
    relativePath === 'next-env.d.ts' ||
    relativePath === 'next.config.ts' ||
    relativePath === 'tailwind.config.ts'
  ) {
    return 'app';
  }
  if (relativePath.startsWith('types/compat/')) {
    return 'app';
  }
  if (relativePath === path.normalize('types/jsx-global.d.ts')) {
    return 'app';
  }
  if (relativePath.startsWith('types/')) {
    return 'core';
  }
  return 'unassigned';
}

function formatFile(filePath: string): string {
  return path.relative(ROOT, filePath);
}

const allSources = fg.sync(SOURCE_GLOBS, {
  cwd: ROOT,
  ignore: IGNORE,
  absolute: true,
  dot: false,
});
const normalizedSources = allSources.map((filePath) => normalize(filePath));
const sourceSet = new Set(normalizedSources);
const coreFiles = listProjectFiles(CORE_CONFIG, sourceSet);
const appFiles = listProjectFiles(APP_CONFIG, sourceSet);
const scriptFiles = listProjectFiles(SCRIPTS_CONFIG, sourceSet);

const violations: Violation[] = [];

for (const filePath of normalizedSources) {
  const normalized = filePath;
  const relPath = formatFile(normalized);
  const inCore = coreFiles.has(normalized);
  const inApp = appFiles.has(normalized);
  const inScripts = scriptFiles.has(normalized);
  const owners = [inCore, inApp, inScripts].filter(Boolean).length;
  const owner = expectedOwner(relPath);

  if (owners === 0) {
    violations.push({
      file: relPath,
      issue: 'orphan: not included in any tsconfig',
      fix: 'Add to an existing tsconfig include or create a folder-level tsconfig.',
    });
    continue;
  }

  if (owners > 1) {
    violations.push({
      file: relPath,
      issue: 'overlap: included by multiple typecheck projects',
      fix: 'Adjust tsconfig include/exclude so the file is owned by exactly one project.',
    });
    continue;
  }

  if (owner === 'unassigned') {
    violations.push({
      file: relPath,
      issue: 'unassigned: file not mapped to app or scripts ownership rules',
      fix: 'Move file under app/tests/scripts, or add a folder tsconfig and update coverage rules.',
    });
    continue;
  }

  if (owner === 'core' && !inCore) {
    violations.push({
      file: relPath,
      issue: 'mis-owned: expected core tsconfig, but not included',
      fix: 'Update tsconfig.core.typecheck.json include/exclude to cover this file.',
    });
    continue;
  }

  if (owner === 'app' && !inApp) {
    violations.push({
      file: relPath,
      issue: 'mis-owned: expected app tsconfig, but not included',
      fix: 'Update tsconfig.app.typecheck.json include/exclude to cover this file.',
    });
    continue;
  }

  if (owner === 'scripts' && !inScripts) {
    violations.push({
      file: relPath,
      issue: 'mis-owned: expected scripts tsconfig, but not included',
      fix: 'Update tsconfig.scripts.typecheck.json include/exclude to cover this file.',
    });
  }
}

if (violations.length > 0) {
  const details = violations.map((violation) =>
    `${violation.file}: ${violation.issue} (fix: ${violation.fix})`
  );
  fail(PREFIX, 'TypeScript project coverage violations detected', {
    details,
    fix: FIX,
  });
}

process.stdout.write('check:ts-coverage: ok\n');
