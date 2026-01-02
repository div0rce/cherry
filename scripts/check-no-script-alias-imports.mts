import path from 'node:path';
import { ensureTsEsm } from './lib/ensure-ts-esm.mjs';
import { fail } from './guardrails/lib/fail.mjs';
import { runTool } from './guardrails/lib/run-tool.mjs';

ensureTsEsm();

const PREFIX = 'check:no-script-alias-imports';
const FIX = 'Use relative imports in scripts instead of @/ aliases.';
const ROOT = process.cwd();
const TARGETS = [path.join(ROOT, 'scripts'), path.join(ROOT, 'prisma', 'scripts')];
const PATTERN =
  "(from\\s+['\"]@/|import\\s+['\"]@/|import\\s*\\(\\s*['\"]@/|require\\s*\\(\\s*['\"]@/)";

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

function runRg(pattern: string): string[] {
  const result = runTool('rg', ['-n', '-g', '*.ts', '-g', '*.mts', '-g', '*.cts', pattern, ...TARGETS]);
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
    .filter(Boolean);
}

const violations = runRg(PATTERN).map(parseRgLine);

if (violations.length > 0) {
  const details = violations.map(
    (violation) => `${violation.file}:${violation.line}:${violation.col}: ${violation.illegal}`
  );
  fail(PREFIX, 'Script alias imports are forbidden', {
    details,
    fix: FIX,
  });
}

process.stdout.write('check:no-script-alias-imports: ok\n');
