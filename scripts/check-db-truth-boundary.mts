import path from 'node:path';
import { ensureTsEsm } from './lib/ensure-ts-esm.mjs';
import { fail } from './guardrails/lib/fail.mjs';
import { runTool } from './guardrails/lib/run-tool.mjs';

ensureTsEsm();

const PREFIX = 'check:db-truth-boundary';
const FIX = 'Use @prisma/client directly in db-check scripts; do not import lib/prisma.';
const ROOT = process.cwd();
const TARGETS = [
  path.join(ROOT, 'scripts', 'db-check-optional.mts'),
  path.join(ROOT, 'scripts', 'db-check-required.mts'),
];

type Violation = {
  file: string;
  line: number;
  col: number;
  illegal: string;
};

function parseRgLine(line: string): Violation {
  const [file, lineStr, colStr, ...rest] = line.split(':');
  return {
    file: file ?? '',
    line: Number(lineStr ?? '0'),
    col: Number(colStr ?? '0'),
    illegal: rest.join(':').trim(),
  };
}

const result = runTool('rg', ['-n', '-F', 'lib/prisma', ...TARGETS]);
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

const violations = result.stdout
  .split('\n')
  .map((line) => line.trim())
  .filter((line) => line.length > 0)
  .map(parseRgLine);

if (violations.length > 0) {
  const details = violations.map(
    (violation) => `${violation.file}:${violation.line}:${violation.col}: ${violation.illegal}`
  );
  fail(PREFIX, 'db-check scripts must not import lib/prisma', { details, fix: FIX });
}

process.stdout.write('check:db-truth-boundary: ok\n');
