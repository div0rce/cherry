import fs from 'node:fs';
import path from 'node:path';
import { ensureTsEsm } from './lib/ensure-ts-esm.mts';
import { fail } from './guardrails/lib/fail.mts';
import { runTool } from './guardrails/lib/run-tool.mts';

ensureTsEsm();

const PREFIX = 'check:esm-loader-totality';
const FIX = 'Ensure every load() path returns {source} or delegates to defaultLoad().';
const ROOT = process.cwd();
const SEARCH_ROOTS = ['scripts/lib', 'scripts/guardrails'];

type Violation = {
  file: string;
  reason: string;
};

function listFiles(): string[] {
  const args = ['--files', '-g', '*.mts', ...SEARCH_ROOTS];
  const result = runTool('rg', args);
  if (result.exitCode !== 0 && result.exitCode !== 1) {
    const details: string[] = [];
    if (result.stdout.trim().length > 0) details.push(`stdout: ${result.stdout.trim()}`);
    if (result.stderr.trim().length > 0) details.push(`stderr: ${result.stderr.trim()}`);
    fail(PREFIX, `rg failed with status ${result.exitCode}`, { details, fix: FIX });
  }
  return result.stdout
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function hasLoadHook(content: string): boolean {
  return /\bload\s*\(/.test(content);
}

function hasDefaultLoadFallback(content: string): boolean {
  if (/return\s+defaultLoad/.test(content)) return true;
  if (/defaultLoad\s*\(/.test(content) && /return\s+fallback/.test(content)) return true;
  return false;
}

const violations: Violation[] = [];

for (const relPath of listFiles()) {
  const absolute = path.resolve(ROOT, relPath);
  const content = fs.readFileSync(absolute, 'utf8');
  if (!hasLoadHook(content)) continue;
  if (!content.includes('defaultLoad')) {
    violations.push({
      file: relPath,
      reason: 'load() missing defaultLoad parameter or fallback usage',
    });
    continue;
  }
  if (!hasDefaultLoadFallback(content)) {
    violations.push({
      file: relPath,
      reason: 'load() may return undefined',
    });
  }
}

if (violations.length > 0) {
  process.stderr.write('ESM_LOADER_TOTALITY_VIOLATION\n');
  for (const violation of violations) {
    process.stderr.write(`File: ${violation.file}\n`);
    process.stderr.write(`Reason: ${violation.reason}\n`);
    process.stderr.write('Fix: delegate to defaultLoad()\n');
  }
  fail(PREFIX, 'ESM loader totality violations detected', { fix: FIX });
}

process.stdout.write('esm-loader-totality: ok\n');
