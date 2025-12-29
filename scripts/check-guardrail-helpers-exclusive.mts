import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { ensureTsEsm } from './lib/ensure-ts-esm.mts';
import { fail } from './guardrails/lib/fail.mts';

ensureTsEsm();

const PREFIX = 'check:guardrail-helpers-exclusive';
const FIX = 'Use scripts/guardrails/lib helpers for JSON, errors, and imports.';
const ROOT = process.cwd();
const ALLOWED_JSON_PARSE = new Set([
  path.join(ROOT, 'scripts', 'guardrails', 'lib', 'read-json.mts'),
]);
const SELF_PATH = path.join(ROOT, 'scripts', 'check-guardrail-helpers-exclusive.mts');
const GUARDRAILS_ROOT = path.join(ROOT, 'scripts', 'guardrails');
const GUARDRAILS_LIB = path.join(GUARDRAILS_ROOT, 'lib');

function runRg(pattern: string, targets: string[]): string[] {
  const result = spawnSync('rg', ['-n', pattern, ...targets], { encoding: 'utf8' });
  if (result.status !== 0 && result.status !== 1) {
    fail(PREFIX, `rg failed with status ${result.status ?? 'null'}`, { fix: FIX });
  }
  return (result.stdout ?? '')
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

function isGuardrailScript(filePath: string): boolean {
  if (filePath.startsWith(GUARDRAILS_LIB)) return false;
  if (filePath.startsWith(GUARDRAILS_ROOT)) return true;
  if (!filePath.startsWith(path.join(ROOT, 'scripts'))) return false;
  const base = path.basename(filePath);
  return base.startsWith('check-') && base.endsWith('.mts');
}

const violations: string[] = [];

for (const line of runRg('JSON\\.parse\\s*\\(', ['scripts'])) {
  const parsed = parseRgLine(line);
  const absolute = normalizePath(parsed.file);
  if (ALLOWED_JSON_PARSE.has(absolute)) continue;
  violations.push(`${parsed.file}:${parsed.line}:${parsed.col}: JSON.parse forbidden`);
}

for (const line of runRg('console\\.log', ['scripts'])) {
  const parsed = parseRgLine(line);
  const absolute = normalizePath(parsed.file);
  if (absolute === SELF_PATH) continue;
  violations.push(`${parsed.file}:${parsed.line}:${parsed.col}: console.log forbidden`);
}

for (const line of runRg('catch\\s*\\(', ['scripts'])) {
  const parsed = parseRgLine(line);
  const ext = path.extname(parsed.file);
  if (!['.ts', '.tsx', '.mts', '.cts'].includes(ext)) continue;
  if (parsed.text.includes('unknown')) continue;
  violations.push(`${parsed.file}:${parsed.line}:${parsed.col}: catch must use unknown`);
}

for (const line of runRg('import\\(', ['scripts'])) {
  const parsed = parseRgLine(line);
  const absolute = normalizePath(parsed.file);
  if (!isGuardrailScript(absolute)) continue;
  violations.push(`${parsed.file}:${parsed.line}:${parsed.col}: inline dynamic import forbidden`);
}

for (const line of runRg('scripts/lib/read-json\\.mts|guardrail-format', ['scripts'])) {
  const parsed = parseRgLine(line);
  const absolute = normalizePath(parsed.file);
  if (absolute === SELF_PATH) continue;
  violations.push(`${parsed.file}:${parsed.line}:${parsed.col}: legacy helper import forbidden`);
}

if (violations.length > 0) {
  fail(PREFIX, 'Guardrail helper exclusivity violations detected', {
    details: violations,
    fix: FIX,
  });
}

process.stdout.write('guardrail-helpers-exclusive: ok\n');
