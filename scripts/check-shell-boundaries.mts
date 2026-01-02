import { readFile } from 'node:fs/promises';
import path from 'node:path';
import fg from 'fast-glob';
import { ensureTsEsm } from './lib/ensure-ts-esm.mjs';
import { asMessage } from './guardrails/lib/error.mjs';
import { fail } from './guardrails/lib/fail.mjs';

ensureTsEsm();


type Violation = {
  file: string;
  importPath: string;
  reason: string;
};

const cwd = process.cwd();
const PREFIX = 'check:shell-boundaries';
const FIX = 'Remove cross-shell imports between (dev) and (user) surfaces.';

async function getFiles(pattern: string | string[]): Promise<string[]> {
  return fg(pattern, {
    cwd,
    ignore: ['**/node_modules/**', '**/.next/**', '**/dist/**'],
  });
}

function isDevImport(target: string): boolean {
  return target.startsWith('app/(dev)');
}

function isUserImport(target: string): boolean {
  return target.startsWith('app/(user)');
}

function resolveImport(fromFile: string, importPath: string): string {
  if (importPath.startsWith('@/')) {
    return importPath.replace('@/', '');
  }
  if (importPath.startsWith('./') || importPath.startsWith('../')) {
    const abs = path.resolve(path.dirname(path.join(cwd, fromFile)), importPath);
    return path.relative(cwd, abs);
  }
  return importPath;
}

async function checkFile(file: string, violations: Violation[]): Promise<void> {
  const content = await readFile(path.join(cwd, file), 'utf8');
  const importRegex = /import\s+(?:.+?\s+from\s+)?['"]([^'"]+)['"]/g;
  let match: RegExpExecArray | null;
  while ((match = importRegex.exec(content)) !== null) {
    const raw = match[1] ?? '';
    const resolved = resolveImport(file, raw);

    if (file.startsWith('app/(user)/') && isDevImport(resolved)) {
      violations.push({
        file,
        importPath: raw,
        reason: 'User shell may not import from (dev).',
      });
    }

    if (file.startsWith('app/(dev)/') && isUserImport(resolved)) {
      violations.push({
        file,
        importPath: raw,
        reason: 'Dev shell may not import from (user).',
      });
    }
  }
}

async function main(): Promise<void> {
  const files = await getFiles(['app/**/*.ts', 'app/**/*.tsx', 'components/**/*.ts', 'components/**/*.tsx']);
  const violations: Violation[] = [];

  await Promise.all(files.map((file) => checkFile(file, violations)));

  if (violations.length > 0) {
    const details = violations.map(
      (violation) =>
        `${violation.file}:1:1: imports \"${violation.importPath}\" (${violation.reason})`
    );
    fail(PREFIX, 'Shell boundary violations detected', { details, fix: FIX });
  }

  process.stdout.write('Shell boundary check passed.\n');
}

void main().catch((error: unknown) => {
  const message = asMessage(error);
  fail(PREFIX, `Guardrail crashed: ${message}`, { fix: FIX });
});
