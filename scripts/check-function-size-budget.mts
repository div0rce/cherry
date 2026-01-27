import * as fs from 'node:fs';
import * as path from 'node:path';
import fg from 'fast-glob';
import { ensureTsEsm } from './lib/ensure-ts-esm.mjs';
import { asMessage } from './guardrails/lib/error.mjs';
import { fail } from './guardrails/lib/fail.mjs';
import { readJsonFile } from './guardrails/lib/read-json.mjs';

ensureTsEsm();

const PREFIX = 'check:function-size-budget';
const FIX = 'Reduce function size or update the budget in scripts/check-function-size-budget.mts.';
const ROOT_ENV = process.env['CHERRY_FUNCTION_SIZE_BUDGET_ROOT'];
const ROOT = ROOT_ENV !== undefined && ROOT_ENV !== ''
  ? path.resolve(ROOT_ENV)
  : process.cwd();
const LIMIT_ENV = process.env['CHERRY_FUNCTION_SIZE_BUDGET_MAX_BYTES'];
const DEFAULT_LIMIT_BYTES = 50 * 1024 * 1024;
const OUTPUT_SUBDIR_ENV = process.env['CHERRY_FUNCTION_SIZE_BUDGET_OUTPUT_SUBDIR'];
const OUTPUT_SUBDIR =
  OUTPUT_SUBDIR_ENV !== undefined && OUTPUT_SUBDIR_ENV.trim().length > 0
    ? OUTPUT_SUBDIR_ENV.trim()
    : path.join('.vercel', 'output', 'functions');
const OUTPUT_ROOT = path.isAbsolute(OUTPUT_SUBDIR)
  ? OUTPUT_SUBDIR
  : path.join(ROOT, OUTPUT_SUBDIR);

type Violation = {
  functionName: string;
  sizeBytes: number;
  limitBytes: number;
};

function normalizePath(filePath: string): string {
  return filePath.split(path.sep).join('/');
}

function toNumber(value: string | undefined): number | null {
  if (value === undefined || value.trim() === '') return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

function resolveLimitBytes(): number {
  const override = toNumber(LIMIT_ENV);
  if (override !== null) {
    return override;
  }
  if (LIMIT_ENV !== undefined && LIMIT_ENV.trim().length > 0) {
    fail(PREFIX, `Invalid CHERRY_FUNCTION_SIZE_BUDGET_MAX_BYTES=${LIMIT_ENV}`, { fix: FIX });
  }
  return DEFAULT_LIMIT_BYTES;
}

function collectSizeBytes(dirPath: string): number {
  let total = 0;
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      total += collectSizeBytes(fullPath);
      continue;
    }
    if (entry.isFile()) {
      total += fs.statSync(fullPath).size;
    }
  }
  return total;
}

function functionNameFor(configPath: string): string {
  const relative = path.relative(OUTPUT_ROOT, path.dirname(configPath));
  return normalizePath(relative);
}

function main(): void {
  try {
    if (fs.existsSync(OUTPUT_ROOT) === false) {
      process.stdout.write(
        `check:function-size-budget: skipped (missing ${normalizePath(OUTPUT_SUBDIR)})\n`
      );
      return;
    }

    const configs = fg.sync('**/.vc-config.json', { cwd: OUTPUT_ROOT, onlyFiles: true });
    if (configs.length === 0) {
      fail(
        PREFIX,
        `No .vc-config.json files found under ${normalizePath(OUTPUT_SUBDIR)}`,
        { fix: FIX }
      );
    }

    const limitBytes = resolveLimitBytes();
    const violations: Violation[] = [];

    for (const relPath of configs) {
      const configPath = path.join(OUTPUT_ROOT, relPath);
      void readJsonFile(configPath);
      const dirPath = path.dirname(configPath);
      const sizeBytes = collectSizeBytes(dirPath);
      if (sizeBytes > limitBytes) {
        violations.push({
          functionName: functionNameFor(configPath),
          sizeBytes,
          limitBytes,
        });
      }
    }

    if (violations.length > 0) {
      const details = violations.map(
        (violation) =>
          `${violation.functionName}: size=${violation.sizeBytes} limit=${violation.limitBytes}`
      );
      fail(PREFIX, 'Serverless function size budget exceeded', { details, fix: FIX });
    }

    process.stdout.write('check:function-size-budget: ok\n');
  } catch (error: unknown) {
    const message = asMessage(error);
    fail(PREFIX, `Guardrail crashed: ${message}`, { fix: FIX });
  }
}

main();
