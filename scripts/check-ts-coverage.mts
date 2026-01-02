import fs from 'node:fs';
import path from 'node:path';
import fg from 'fast-glob';
import { ensureTsEsm } from './lib/ensure-ts-esm.mjs';
import { fail } from './guardrails/lib/fail.mjs';
import { runTool } from './guardrails/lib/run-tool.mjs';

ensureTsEsm();

const PREFIX = 'check:ts-coverage';
const FIX = 'Ensure every TS source is owned by exactly one tsconfig project.';
const ROOT = process.cwd();
const SOURCE_GLOBS = ['**/*.{ts,tsx,mts,cts}'];
const IGNORE = [
  '**/node_modules/**',
  '**/.next/**',
  '**/dist/**',
  '**/dist-scripts/**',
  '**/build/**',
  '**/coverage/**',
  'tests/fixtures/**',
];
const APP_CONFIG = path.join(ROOT, 'tsconfig.json');
const SCRIPTS_CONFIG = path.join(ROOT, 'tsconfig.scripts.json');
const TSC_BIN = path.join(ROOT, 'node_modules', 'typescript', 'bin', 'tsc');

type Owner = 'app' | 'scripts' | 'unassigned';

type Violation = {
  file: string;
  issue: string;
  fix: string;
};

function normalize(filePath: string): string {
  return path.normalize(path.resolve(filePath));
}

function listProjectFiles(tsconfigPath: string): Set<string> {
  const result = runTool('node', [
    TSC_BIN,
    '-p',
    tsconfigPath,
    '--noEmit',
    '--listFilesOnly',
    '--noResolve',
    '--pretty',
    'false',
  ]);
  const files = result.stdout
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((filePath) => normalize(filePath))
    .filter((filePath) => fs.existsSync(filePath));
  if (files.length === 0) {
    const details: string[] = [];
    if (result.stdout.trim().length > 0) {
      details.push(`stdout: ${result.stdout.trim()}`);
    }
    if (result.stderr.trim().length > 0) {
      details.push(`stderr: ${result.stderr.trim()}`);
    }
    fail(PREFIX, `tsc failed to list files for ${tsconfigPath}`, { details, fix: FIX });
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
    relativePath.startsWith('types/') ||
    relativePath === 'middleware.ts' ||
    relativePath === 'next-env.d.ts' ||
    relativePath === 'next.config.ts' ||
    relativePath === 'tailwind.config.ts'
  ) {
    return 'app';
  }
  return 'unassigned';
}

function formatFile(filePath: string): string {
  return path.relative(ROOT, filePath);
}

const allSources = fg.sync(SOURCE_GLOBS, {
  ignore: IGNORE,
  absolute: true,
  dot: false,
});
const appFiles = listProjectFiles(APP_CONFIG);
const scriptFiles = listProjectFiles(SCRIPTS_CONFIG);

const violations: Violation[] = [];

for (const filePath of allSources) {
  const normalized = normalize(filePath);
  const relPath = formatFile(normalized);
  const inApp = appFiles.has(normalized);
  const inScripts = scriptFiles.has(normalized);
  const owner = expectedOwner(relPath);

  if (!inApp && !inScripts) {
    violations.push({
      file: relPath,
      issue: 'orphan: not included in any tsconfig',
      fix: 'Add to an existing tsconfig include or create a folder-level tsconfig.',
    });
    continue;
  }

  if (inApp && inScripts) {
    violations.push({
      file: relPath,
      issue: 'overlap: included by both tsconfig.json and tsconfig.scripts.json',
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

  if (owner === 'app' && !inApp) {
    violations.push({
      file: relPath,
      issue: 'mis-owned: expected app tsconfig, but not included',
      fix: 'Update tsconfig.app.json include/exclude to cover this file.',
    });
    continue;
  }

  if (owner === 'scripts' && !inScripts) {
    violations.push({
      file: relPath,
      issue: 'mis-owned: expected scripts tsconfig, but not included',
      fix: 'Update tsconfig.scripts.json include/exclude to cover this file.',
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
