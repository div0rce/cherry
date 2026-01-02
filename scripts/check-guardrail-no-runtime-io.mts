import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ensureTsEsm } from './lib/ensure-ts-esm.mjs';
import { fail } from './guardrails/lib/fail.mjs';
import { runTool } from './guardrails/lib/run-tool.mjs';

ensureTsEsm();

const PREFIX = 'check:guardrail-no-runtime-io';
const FIX = 'Guardrails must be pure and deterministic (no runtime I/O).';
const ROOT_ENV = process.env['CHERRY_GUARDRAIL_NO_RUNTIME_IO_ROOT'];
const ROOT = ROOT_ENV !== undefined && ROOT_ENV !== '' ? path.resolve(ROOT_ENV) : process.cwd();
const SCRIPTS_ROOT = path.join(ROOT, 'scripts');
const GUARDRAILS_ROOT = path.join(SCRIPTS_ROOT, 'guardrails');
const TARGETS = [SCRIPTS_ROOT];
const SELF_PATH = path.normalize(path.resolve(fileURLToPath(import.meta.url)));

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

function normalizePath(filePath: string): string {
  return path.normalize(path.resolve(filePath));
}

function isGuardrailScript(filePath: string): boolean {
  const absolute = normalizePath(filePath);
  if (absolute.startsWith(GUARDRAILS_ROOT)) return true;
  if (!absolute.startsWith(SCRIPTS_ROOT)) return false;
  const base = path.basename(absolute);
  return base.startsWith('check-') && base.endsWith('.mts');
}

function runRg(pattern: string): string[] {
  const result = runTool('rg', ['--column', '-n', pattern, ...TARGETS]);
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
    pattern: '^\\s*import\\s+.*\\s+from\\s+[\'"]@prisma\\/client[\'"]',
    illegal: 'import @prisma/client',
    fix: 'Guardrails must not import Prisma runtime.',
  },
  {
    pattern: '\\brequire\\s*\\(\\s*[\'"]@prisma\\/client[\'"]\\s*\\)',
    illegal: 'require @prisma/client',
    fix: 'Guardrails must not import Prisma runtime.',
  },
  {
    pattern: '\\bnew\\s+PrismaClient\\b',
    illegal: 'new PrismaClient',
    fix: 'Guardrails must not instantiate PrismaClient.',
  },
  {
    pattern: '\\bprisma\\.[A-Za-z0-9_]+\\.(findFirst|findMany|findUnique|count|create|update|delete|upsert)\\s*\\(',
    illegal: 'prisma.* query invocation',
    fix: 'Guardrails must not issue Prisma queries.',
  },
  {
    pattern: '(^|[^A-Za-z0-9_\'"`])fetch\\s*\\(',
    illegal: 'fetch',
    fix: 'Guardrails must not perform network I/O.',
  },
  {
    pattern: '\\bhttps?\\.(request|get)\\s*\\(',
    illegal: 'http/https request',
    fix: 'Guardrails must not open sockets.',
  },
  {
    pattern: '\\b(net|tls)\\.(connect|createConnection|createServer|Socket)\\b',
    illegal: 'net/tls socket',
    fix: 'Guardrails must not open sockets.',
  },
  {
    pattern:
      '\\bfs\\.(writeFileSync|appendFileSync|createWriteStream|rmSync|unlinkSync|renameSync|mkdirSync)\\s*\\(',
    illegal: 'fs write',
    fix: 'Guardrails must not perform filesystem writes.',
  },
  {
    pattern:
      '\\bfs\\.promises\\.(writeFile|appendFile|rm|unlink|rename|mkdir)\\s*\\(',
    illegal: 'fs promises write',
    fix: 'Guardrails must not perform filesystem writes.',
  },
];

const violations: Violation[] = [];

for (const check of checks) {
  for (const line of runRg(check.pattern)) {
    const parsed = parseRgLine(line);
    const absolutePath = normalizePath(parsed.file);
    if (
      absolutePath === SELF_PATH &&
      (/pattern:\s*['"]/.test(parsed.illegal) || /illegal:\s*['"]/.test(parsed.illegal))
    ) {
      continue;
    }
    if (isGuardrailScript(parsed.file) === false) continue;
    violations.push({
      file: parsed.file,
      line: parsed.line,
      col: parsed.col,
      illegal: `${check.illegal}: ${parsed.illegal}`,
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
