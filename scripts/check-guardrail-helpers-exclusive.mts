import path from 'node:path';
import { ensureTsEsm } from './lib/ensure-ts-esm.mts';
import { fail } from './guardrails/lib/fail.mts';
import { runTool } from './guardrails/lib/run-tool.mts';

ensureTsEsm();

const PREFIX = 'check:guardrail-helpers-exclusive';
const ROOT = process.cwd();
const FIX = 'Use scripts/guardrails/lib helpers for JSON, errors, and imports.';
const SCRIPTS_ROOT = path.join(ROOT, 'scripts');
const GUARDRAILS_ROOT = path.join(SCRIPTS_ROOT, 'guardrails');
const GUARDRAILS_LIB = path.join(GUARDRAILS_ROOT, 'lib');
const CANONICAL_READ_JSON = path.join(GUARDRAILS_LIB, 'read-json.mts');
const ERROR_HELPER_NAME = ['as', 'Error'].join('');

type Violation = {
  file: string;
  line?: number;
  col?: number;
  illegal: string;
  fix: string;
};

function reportViolations(violations: Violation[]): void {
  console.error('GUARDRAIL_HELPER_DUPLICATION');
  for (const violation of violations) {
    console.error(`File: ${violation.file}`);
    console.error(`Illegal: ${violation.illegal}`);
    console.error(`Fix: ${violation.fix}`);
  }
}

function runRg(pattern: string, targets: string[], extraArgs: string[] = []): string[] {
  const result = runTool('rg', ['-n', ...extraArgs, pattern, ...targets]);
  if (result.exitCode !== 0 && result.exitCode !== 1) {
    console.error('GUARDRAIL_HELPER_DUPLICATION');
    if (result.stdout.trim().length > 0) {
      console.error(result.stdout.trim());
    }
    if (result.stderr.trim().length > 0) {
      console.error(result.stderr.trim());
    }
    fail(PREFIX, `rg failed with status ${result.exitCode}`, { fix: FIX });
  }
  return result.stdout
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function parseRgLine(line: string): { file: string; line: number; col: number; text: string } {
  const parts = line.split(':');
  const file = parts[0] ?? '';
  const lineNum = Number(parts[1] ?? '1');
  const colNum = Number(parts[2] ?? '1');
  const text = parts.slice(3).join(':').trim();
  return {
    file,
    line: Number.isFinite(lineNum) ? lineNum : 1,
    col: Number.isFinite(colNum) ? colNum : 1,
    text,
  };
}

function normalizePath(filePath: string): string {
  return path.normalize(path.resolve(filePath));
}

function isGuardrailsLib(filePath: string): boolean {
  return filePath.startsWith(GUARDRAILS_LIB);
}

function isGuardrailScript(filePath: string): boolean {
  if (filePath.startsWith(GUARDRAILS_LIB)) return false;
  if (filePath.startsWith(GUARDRAILS_ROOT)) return true;
  if (!filePath.startsWith(SCRIPTS_ROOT)) return false;
  const base = path.basename(filePath);
  return base.startsWith('check-') && base.endsWith('.mts');
}

function runRgFiles(glob: string): string[] {
  const result = runTool('rg', ['--files', '-g', glob]);
  if (result.exitCode !== 0 && result.exitCode !== 1) {
    console.error('GUARDRAIL_HELPER_DUPLICATION');
    if (result.stdout.trim().length > 0) {
      console.error(result.stdout.trim());
    }
    if (result.stderr.trim().length > 0) {
      console.error(result.stderr.trim());
    }
    fail(PREFIX, `rg failed with status ${result.exitCode}`, { fix: FIX });
  }
  return result.stdout
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

const violations: Violation[] = [];

const scriptGlob = ['-g', '*.mts'];
const jsonParseFix = 'Use readJsonFile/parseJson from scripts/guardrails/lib/read-json.mts.';
for (const line of runRg('\\bJSON\\s*\\.\\s*parse\\s*\\(', ['scripts'], scriptGlob)) {
  const parsed = parseRgLine(line);
  violations.push({
    file: parsed.file,
    line: parsed.line,
    col: parsed.col,
    illegal: 'JSON.parse',
    fix: jsonParseFix,
  });
}

for (const line of runRg('new\\s+Error\\s*\\(', ['scripts'], scriptGlob)) {
  const parsed = parseRgLine(line);
  violations.push({
    file: parsed.file,
    line: parsed.line,
    col: parsed.col,
    illegal: 'new Error',
    fix: `Use fail(...) or ${ERROR_HELPER_NAME}(...) from scripts/guardrails/lib/error.mts.`,
  });
}

for (const line of runRg('process\\s*\\.\\s*exit\\s*\\(', ['scripts'], scriptGlob)) {
  const parsed = parseRgLine(line);
  violations.push({
    file: parsed.file,
    line: parsed.line,
    col: parsed.col,
    illegal: 'process.exit',
    fix: 'Use fail(...) from scripts/guardrails/lib/fail.mts.',
  });
}

for (const line of runRg('console\\.log\\s*\\(', ['scripts'], scriptGlob)) {
  const parsed = parseRgLine(line);
  violations.push({
    file: parsed.file,
    line: parsed.line,
    col: parsed.col,
    illegal: 'console.log',
    fix: 'Use process.stdout.write or fail(...) instead of console.log.',
  });
}

for (const line of runRg('catch\\s*\\(', ['scripts'])) {
  const parsed = parseRgLine(line);
  const ext = path.extname(parsed.file);
  if (!['.ts', '.tsx', '.mts', '.cts'].includes(ext)) continue;
  if (parsed.text.includes('unknown')) continue;
  violations.push({
    file: parsed.file,
    line: parsed.line,
    col: parsed.col,
    illegal: 'catch without unknown',
    fix: `Use catch (error: unknown) and normalize via ${ERROR_HELPER_NAME}/asMessage.`,
  });
}

for (const line of runRg('import\\(', ['scripts'], scriptGlob)) {
  const parsed = parseRgLine(line);
  const absolute = normalizePath(parsed.file);
  if (!isGuardrailScript(absolute)) continue;
  violations.push({
    file: parsed.file,
    line: parsed.line,
    col: parsed.col,
    illegal: 'inline dynamic import',
    fix: 'Use importTyped from scripts/guardrails/lib/import-typed.mts.',
  });
}

const helperNames = ['fail', ERROR_HELPER_NAME, 'asMessage', 'readJson', 'readJsonFile', 'parseJson'];
const helperDefPattern = [
  '\\bfunction\\s+(',
  helperNames.join('|'),
  ')\\b|\\b(?:const|let|var)\\s+(',
  helperNames.join('|'),
  ')\\b',
].join('');
for (const line of runRg(helperDefPattern, ['scripts'], scriptGlob)) {
  const parsed = parseRgLine(line);
  const absolute = normalizePath(parsed.file);
  if (isGuardrailsLib(absolute)) continue;
  violations.push({
    file: parsed.file,
    line: parsed.line,
    col: parsed.col,
    illegal: 'inline helper definition',
    fix: 'Import helpers from scripts/guardrails/lib/*.',
  });
}

const guardrailFormatFiles = runRgFiles('scripts/**/guardrail-format.mts');
for (const filePath of guardrailFormatFiles) {
  violations.push({
    file: path.relative(ROOT, filePath),
    illegal: 'guardrail-format helper',
    fix: 'Delete guardrail-format.mts and use scripts/guardrails/lib/*.',
  });
}

const readJsonFiles = runRgFiles('scripts/**/read-json.mts');
for (const filePath of readJsonFiles) {
  const normalized = normalizePath(filePath);
  if (normalized === normalizePath(CANONICAL_READ_JSON)) continue;
  violations.push({
    file: path.relative(ROOT, filePath),
    illegal: 'read-json helper outside scripts/guardrails/lib',
    fix: 'Delete duplicate read-json.mts and use scripts/guardrails/lib/read-json.mts.',
  });
}

if (violations.length > 0) {
  reportViolations(violations);
  fail(PREFIX, 'Guardrail helper exclusivity violations detected', { fix: FIX });
}

process.stdout.write('guardrail-helpers-exclusive: ok\n');
