import * as path from 'node:path';
import { ensureTsEsm } from './lib/ensure-ts-esm.mjs';
import { fail } from './guardrails/lib/fail.mjs';
import { runTool } from './guardrails/lib/run-tool.mjs';

ensureTsEsm();

const PREFIX = 'check:no-ts-extension-imports';
const FIX = 'Use runtime extensions (.js/.mjs/.cjs) in Node scripts.';
const ROOT_ENV = process.env['CHERRY_NO_TS_EXTENSION_IMPORTS_ROOT'];
const ROOT = ROOT_ENV !== undefined && ROOT_ENV !== '' ? path.resolve(ROOT_ENV) : process.cwd();
const TARGETS = [path.join(ROOT, 'scripts'), path.join(ROOT, 'prisma', 'scripts')];
const PATTERN =
  "(from\\s+['\"][^'\"]+\\.(?:ts|mts|cts)['\"]|import\\s*\\(\\s*['\"][^'\"]+\\.(?:ts|mts|cts)['\"]\\s*\\))";

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
  fail(PREFIX, 'TS extension imports are forbidden in scripts', {
    details,
    fix: FIX,
  });
}

process.stdout.write('check:no-ts-extension-imports: ok\n');
