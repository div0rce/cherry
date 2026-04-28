import * as path from 'node:path';
import fg from 'fast-glob';

export const TEST_GLOBS = ['tests/**/*.test.{js,ts,tsx}'] as const;

export const ROOT_GLOBS = [...TEST_GLOBS] as const;

export const GLOBAL_EXCLUDED = [
  'tests/fixtures/**',
  '**/__mocks__/**',
] as const;

export const RUNTIME_EXCLUDED = [
  ...GLOBAL_EXCLUDED,
  'tests/db/**',
] as const;

export const EXCLUDED = [
  ...GLOBAL_EXCLUDED,
  'tests/node/**',
  'tests/next/**',
  'tests/db/**',
] as const;

export const NODE_GLOBS = ['tests/node/**/*.test.{js,ts,tsx}'] as const;

export const NEXT_GLOBS = ['tests/next/**/*.test.{js,ts,tsx}'] as const;

export const DB_GLOBS = ['tests/db/**/*.test.{js,ts,tsx}'] as const;

export const ROOT_ALLOWED_GLOBS = [
  'tests/*.test.{js,ts,tsx}',
  'tests/accounting/**/*.test.{js,ts,tsx}',
  'tests/authority/**/*.test.{js,ts,tsx}',
  'tests/engine/**/*.test.{js,ts,tsx}',
  'tests/guardrails/**/*.test.{js,ts,tsx}',
  'tests/migrations/**/*.test.{js,ts,tsx}',
  'tests/type/**/*.test.{js,ts,tsx}',
] as const;

function normalizeRelativePath(filePath: string): string {
  return path.normalize(filePath).split(path.sep).join('/');
}

export async function resolveFiles(
  include: readonly string[],
  exclude: readonly string[],
  cwd = process.cwd()
): Promise<string[]> {
  const files = await fg([...include], {
    cwd,
    ignore: [...exclude],
    onlyFiles: true,
    unique: true,
    dot: false,
    absolute: false,
  });

  return [...new Set(files.map(normalizeRelativePath))].sort();
}

export async function resolveUnexpectedRootFiles(
  rootFiles: readonly string[],
  cwd = process.cwd()
): Promise<string[]> {
  const allowed = new Set(await resolveFiles(ROOT_ALLOWED_GLOBS, EXCLUDED, cwd));
  return rootFiles.filter((file) => !allowed.has(file));
}
