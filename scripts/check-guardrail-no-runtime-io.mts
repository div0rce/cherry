import path from 'node:path';
import { ensureTsEsm } from './lib/ensure-ts-esm.mts';
import { fail } from './guardrails/lib/fail.mts';
import { runTool } from './guardrails/lib/run-tool.mts';

ensureTsEsm();

const PREFIX = 'check:guardrail-no-runtime-io';
const FIX = 'Guardrails must be pure and deterministic (no runtime I/O).';
const TARGETS = [path.join('scripts', 'guardrails')];

type Violation = {
  file: string;
  line: number | null;
  col: number | null;
  illegal: string;
  fix: string;
};

function parseRgLine(line: string): Violation {
  const match = line.match(/^(.*?):(\d+):(\d+):(.*)$/);
  if (match === null) {
    return { file: line, line: null, col: null, illegal: 'unknown', fix: FIX };
  }
  return {
    file: match[1] ?? line,
    line: Number(match[2]),
    col: Number(match[3]),
    illegal: (match[4] ?? '').trim(),
    fix: FIX,
  };
}

function runRg(pattern: string): string[] {
  const result = runTool('rg', ['-n', pattern, ...TARGETS]);
  if (result.exitCode !== 0 && result.exitCode !== 1) {
    fail(PREFIX, `rg failed with status ${result.exitCode}`, {
      details: [`stdout=${result.stdout.trim()}`, `stderr=${result.stderr.trim()}`],
      fix: FIX,
    });
  }
  return result.stdout
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

const checks: Array<{ pattern: string; illegal: string; fix: string }> = [
  {
    pattern: '\\bnew\\s+PrismaClient\\b',
    illegal: 'new PrismaClient',
    fix: 'Guardrails must not instantiate PrismaClient.',
  },
  {
    pattern: '\\bfetch\\s*\\(',
    illegal: 'fetch',
    fix: 'Guardrails must not perform network I/O.',
  },
  {
    pattern: '\\bhttps?\\.request\\b|\\bhttps?\\.get\\b',
    illegal: 'http/https request',
    fix: 'Guardrails must not open sockets.',
  },
  {
    pattern: '\\bnet\\.[A-Za-z]+\\b|\\btls\\.[A-Za-z]+\\b',
    illegal: 'net/tls socket',
    fix: 'Guardrails must not open sockets.',
  },
  {
    pattern:
      '\\bfs\\.(writeFileSync|appendFileSync|createWriteStream|rmSync|unlinkSync|renameSync|mkdirSync)\\b',
    illegal: 'fs write',
    fix: 'Guardrails must not perform filesystem writes.',
  },
  {
    pattern:
      '\\bfs\\.promises\\.(writeFile|appendFile|rm|unlink|rename|mkdir)\\b',
    illegal: 'fs promises write',
    fix: 'Guardrails must not perform filesystem writes.',
  },
];

const violations: Violation[] = [];

for (const check of checks) {
  for (const line of runRg(check.pattern)) {
    const parsed = parseRgLine(line);
    violations.push({
      file: parsed.file,
      line: parsed.line,
      col: parsed.col,
      illegal: check.illegal,
      fix: check.fix,
    });
  }
}

if (violations.length > 0) {
  process.stderr.write('GUARDRAIL_NO_RUNTIME_IO_VIOLATION\n');
  for (const violation of violations) {
    const location =
      violation.line !== null && violation.col !== null
        ? `${violation.file}:${violation.line}:${violation.col}`
        : violation.file;
    process.stderr.write(`File: ${location}\nIllegal: ${violation.illegal}\nFix: ${violation.fix}\n`);
  }
  fail(PREFIX, 'Guardrail runtime I/O violations detected', { fix: FIX });
}

process.stdout.write('guardrail-no-runtime-io: ok\n');
