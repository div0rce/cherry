import path from 'node:path';
import { ensureTsEsm } from './lib/ensure-ts-esm.mts';
import { fail } from './guardrails/lib/fail.mts';
import { runTool } from './guardrails/lib/run-tool.mts';

ensureTsEsm();

const PREFIX = 'check:guardrail-subprocess-totality';
const FIX = 'Use scripts/guardrails/lib/run-tool.mts for all guardrail subprocesses.';
const ROOT = process.cwd();
const RUN_TOOL_PATH = path.normalize(
  path.resolve(ROOT, 'scripts', 'guardrails', 'lib', 'run-tool.mts')
);

type Violation = {
  file: string;
  line?: number;
  col?: number;
  illegal: string;
  fix: string;
};

const GLOBS = [
  '-g',
  'scripts/check-*.mts',
  '-g',
  'scripts/guardrails/**/*.mts',
  '-g',
  '!scripts/guardrails/lib/run-tool.mts',
];

function parseRgLine(line: string): { file: string; line: number; col: number } {
  const parts = line.split(':');
  const file = parts[0] ?? '';
  const lineNum = Number(parts[1] ?? '1');
  const colNum = Number(parts[2] ?? '1');
  return {
    file,
    line: Number.isFinite(lineNum) ? lineNum : 1,
    col: Number.isFinite(colNum) ? colNum : 1,
  };
}

function reportViolations(violations: Violation[]): void {
  process.stderr.write('GUARDRAIL_SUBPROCESS_TOTALITY\n');
  for (const violation of violations) {
    process.stderr.write(`File: ${violation.file}\n`);
    process.stderr.write(`Illegal: ${violation.illegal}\n`);
    process.stderr.write(`Fix: ${violation.fix}\n`);
  }
}

function runRg(pattern: string): string[] {
  const result = runTool('rg', ['-n', ...GLOBS, pattern, '.']);
  if (result.exitCode !== 0 && result.exitCode !== 1) {
    const details: string[] = [];
    if (result.stdout.trim().length > 0) {
      details.push(`stdout: ${result.stdout.trim()}`);
    }
    if (result.stderr.trim().length > 0) {
      details.push(`stderr: ${result.stderr.trim()}`);
    }
    fail(PREFIX, `rg failed with status ${result.exitCode}`, { details, fix: FIX });
  }
  return result.stdout
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

const violations: Violation[] = [];

const patterns = [
  {
    regex: "from\\s+['\"]node:child_process['\"]",
    illegal: 'node:child_process import',
  },
  {
    regex: "from\\s+['\"]child_process['\"]",
    illegal: 'child_process import',
  },
  {
    regex: "require\\s*\\(\\s*['\"]child_process['\"]\\s*\\)",
    illegal: 'child_process require',
  },
  {
    regex: '\\bchild_process\\s*\\.',
    illegal: 'child_process namespace',
  },
  {
    regex: "from\\s+['\"]execa['\"]",
    illegal: 'execa import',
  },
  {
    regex: '\\bexeca\\s*\\(',
    illegal: 'execa',
  },
];

for (const pattern of patterns) {
  for (const line of runRg(pattern.regex)) {
    const parsed = parseRgLine(line);
    const absolute = path.normalize(path.resolve(parsed.file));
    if (absolute === RUN_TOOL_PATH) continue;
    violations.push({
      file: parsed.file,
      line: parsed.line,
      col: parsed.col,
      illegal: pattern.illegal,
      fix: FIX,
    });
  }
}

if (violations.length > 0) {
  reportViolations(violations);
  fail(PREFIX, 'Guardrail subprocess usage must route through run-tool.mts', { fix: FIX });
}

process.stdout.write('guardrail-subprocess-totality: ok\n');
