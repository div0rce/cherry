import * as fs from 'node:fs';
import * as path from 'node:path';
import { ensureTsEsm } from './lib/ensure-ts-esm.mjs';
import { fail } from './guardrails/lib/fail.mjs';
import { runTool } from './guardrails/lib/run-tool.mjs';

ensureTsEsm();

const PREFIX = 'check:guardrail-subprocess-totality';
const FIX = 'Use runTool() from scripts/guardrails/lib/run-tool.mts.';
const ROOT = process.cwd();
const RUN_TOOL_PATH = path.normalize(
  path.resolve(ROOT, 'scripts', 'guardrails', 'lib', 'run-tool.mts')
);
const SELF_PATH = path.normalize(
  path.resolve(ROOT, 'scripts', 'check-guardrail-subprocess-totality.mts')
);
const FULL_CHECKOUT_AUDIT_PATH = path.normalize(
  path.resolve(ROOT, 'scripts', 'audit', 'full-checkout-audit.mts')
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
  'scripts/**/*.{ts,tsx,mts,cts,js,mjs,cjs}',
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
  process.stderr.write('SUBPROCESS_TOTALITY_VIOLATION\n');
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

function assertFullCheckoutAuditUsesRunTool(): void {
  if (!fs.existsSync(FULL_CHECKOUT_AUDIT_PATH)) {
    fail(PREFIX, 'Missing full checkout audit script', {
      details: [path.relative(ROOT, FULL_CHECKOUT_AUDIT_PATH)],
      fix: FIX,
    });
  }
  const content = fs.readFileSync(FULL_CHECKOUT_AUDIT_PATH, 'utf8');
  const directSubprocessPatterns = [
    { regex: /from\s+['"]node:child_process['"]/, illegal: 'node:child_process import' },
    { regex: /from\s+['"]child_process['"]/, illegal: 'child_process import' },
    { regex: /require\s*\(\s*['"]child_process['"]\s*\)/, illegal: 'child_process require' },
    { regex: /\bspawn(?:Sync)?\s*\(/, illegal: 'spawn/spawnSync' },
    { regex: /\bexec(?:Sync|File|FileSync)?\s*\(/, illegal: 'exec/execSync/execFile' },
  ];

  const violations = directSubprocessPatterns
    .filter((pattern) => pattern.regex.test(content))
    .map((pattern) => ({
      file: path.relative(ROOT, FULL_CHECKOUT_AUDIT_PATH),
      illegal: pattern.illegal,
      fix: FIX,
    }));

  if (violations.length > 0) {
    reportViolations(violations);
    fail(PREFIX, 'full-checkout-audit.mts must route subprocess work through run-tool.mts', {
      fix: FIX,
    });
  }
}

assertFullCheckoutAuditUsesRunTool();

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
    regex: '\\bspawnSync\\b',
    illegal: 'spawnSync',
  },
  {
    regex: '\\bexecSync\\b',
    illegal: 'execSync',
  },
  {
    regex: "from\\s+['\"]execa['\"]",
    illegal: 'execa import',
  },
  {
    regex: '\\bexeca\\s*\\(',
    illegal: 'execa',
  },
  {
    regex: '\\bBun\\.spawn\\b',
    illegal: 'Bun.spawn',
  },
  {
    regex: '\\bDeno\\.run\\b',
    illegal: 'Deno.run',
  },
];

for (const pattern of patterns) {
  for (const line of runRg(pattern.regex)) {
    const parsed = parseRgLine(line);
    const absolute = path.normalize(path.resolve(parsed.file));
    if (absolute === SELF_PATH) continue;
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
