import * as fs from 'node:fs';
import * as path from 'node:path';
import fg from 'fast-glob';
import { z } from 'zod';
import { ensureTsEsm } from './lib/ensure-ts-esm.mjs';
import { asMessage } from './guardrails/lib/error.mjs';
import { fail } from './guardrails/lib/fail.mjs';
import { readJsonFile } from './guardrails/lib/read-json.mjs';

ensureTsEsm();

type Violation = {
  file: string;
  line: number;
  col: number;
  token: string;
};

const ROOT_ENV = process.env['CHERRY_PROJECTED_LIQUID_CENTS_ROOT'];
const ROOT =
  ROOT_ENV !== undefined && ROOT_ENV !== '' ? path.resolve(ROOT_ENV) : process.cwd();
const RULE = 'check:projected-liquid-cents';
const TOKEN = 'projectedLiquidCents';
const FIX =
  'Remove literal-cash consumers of projectedLiquidCents or add an explicit allowlist entry where ownership is intentional.';
const TARGET_GLOBS = [
  'app/**/*.{ts,tsx,js,jsx,mts,cts,mjs,cjs}',
  'lib/**/*.{ts,tsx,js,jsx,mts,cts,mjs,cjs}',
  'tests/**/*.{ts,tsx,js,jsx,mts,cts,mjs,cjs}',
];
const IGNORE = [
  '**/node_modules/**',
  '**/.git/**',
  '**/.next/**',
  '**/dist/**',
  '**/build/**',
  '**/out/**',
  '**/coverage/**',
  '**/dist-scripts/**',
  '**/.tmp/**',
  '**/tests/fixtures/**',
  '**/tests/replay/**',
];
const ALLOWLIST_PATH = path.join(
  ROOT,
  'scripts',
  'guardrails',
  'projected-liquid-cents.allowlist.json'
);
const AllowlistSchema = z
  .object({
    files: z.array(z.string()).default([]),
  })
  .strict();
const TOKEN_RE = /\bprojectedLiquidCents\b/g;

function normalizePath(filePath: string): string {
  return path.normalize(path.relative(ROOT, filePath));
}

function lineColForIndex(text: string, index: number): { line: number; col: number } {
  if (index <= 0) return { line: 1, col: 1 };
  const slice = text.slice(0, index);
  const line = slice.split('\n').length;
  const lastNewline = slice.lastIndexOf('\n');
  const col = lastNewline === -1 ? index + 1 : index - lastNewline;
  return { line, col };
}

function stripForScan(content: string): string {
  let result = '';
  let inSingle = false;
  let inDouble = false;
  let inTemplate = false;
  let inLineComment = false;
  let inBlockComment = false;
  let prevChar = '';

  for (let i = 0; i < content.length; i += 1) {
    const char = content[i] ?? '';
    const next = content[i + 1] ?? '';

    if (inLineComment) {
      if (char === '\n') {
        inLineComment = false;
        result += '\n';
      } else {
        result += ' ';
      }
      prevChar = char;
      continue;
    }

    if (inBlockComment) {
      if (char === '*' && next === '/') {
        inBlockComment = false;
        result += '  ';
        i += 1;
        prevChar = '/';
        continue;
      }
      result += char === '\n' ? '\n' : ' ';
      prevChar = char;
      continue;
    }

    if (!inSingle && !inDouble && !inTemplate) {
      if (char === '/' && next === '/') {
        inLineComment = true;
        result += '  ';
        i += 1;
        prevChar = '/';
        continue;
      }
      if (char === '/' && next === '*') {
        inBlockComment = true;
        result += '  ';
        i += 1;
        prevChar = '*';
        continue;
      }
    }

    if (!inDouble && !inTemplate && char === "'" && prevChar !== '\\') {
      inSingle = !inSingle;
      result += ' ';
      prevChar = char;
      continue;
    }
    if (!inSingle && !inTemplate && char === '"' && prevChar !== '\\') {
      inDouble = !inDouble;
      result += ' ';
      prevChar = char;
      continue;
    }
    if (!inSingle && !inDouble && char === '`' && prevChar !== '\\') {
      inTemplate = !inTemplate;
      result += ' ';
      prevChar = char;
      continue;
    }
    if (inTemplate && char === '`' && prevChar !== '\\') {
      inTemplate = false;
      result += ' ';
      prevChar = char;
      continue;
    }

    if (inSingle || inDouble || inTemplate) {
      result += char === '\n' ? '\n' : ' ';
      prevChar = char;
      continue;
    }

    result += char;
    prevChar = char;
  }

  return result;
}

function loadAllowlist(): Set<string> {
  if (!fs.existsSync(ALLOWLIST_PATH)) {
    fail(RULE, 'projectedLiquidCents allowlist missing', {
      details: [normalizePath(ALLOWLIST_PATH)],
      fix: `Add ${path.join('scripts', 'guardrails', 'projected-liquid-cents.allowlist.json')}.`,
    });
  }

  try {
    const parsed = AllowlistSchema.parse(readJsonFile(ALLOWLIST_PATH));
    return new Set(parsed.files.map((file) => path.normalize(file)));
  } catch (error: unknown) {
    fail(RULE, `Invalid allowlist: ${asMessage(error)}`, {
      details: [normalizePath(ALLOWLIST_PATH)],
      fix: 'Fix scripts/guardrails/projected-liquid-cents.allowlist.json.',
    });
  }
}

function main(): void {
  try {
    const allowlist = loadAllowlist();
    const files = fg
      .sync(TARGET_GLOBS, {
        cwd: ROOT,
        absolute: true,
        dot: true,
        ignore: IGNORE,
      })
      .sort();
    const fileSet = new Set(files.map((file) => normalizePath(file)));
    const violations: Violation[] = [];

    for (const filePath of files) {
      const relativePath = normalizePath(filePath);
      if (allowlist.has(relativePath)) continue;

      const content = fs.readFileSync(filePath, 'utf8');
      if (!content.includes(TOKEN)) continue;
      const scanned = stripForScan(content);

      TOKEN_RE.lastIndex = 0;
      const match = TOKEN_RE.exec(scanned);
      if (match === null) continue;

      const { line, col } = lineColForIndex(scanned, match.index);
      violations.push({
        file: relativePath,
        line,
        col,
        token: TOKEN,
      });
    }

    const staleEntries = [...allowlist].filter((file) => !fileSet.has(file));
    if (staleEntries.length > 0) {
      fail(RULE, 'projectedLiquidCents allowlist has stale entries', {
        details: staleEntries.map((file) => `stale=${file}`),
        fix: 'Remove stale entries from scripts/guardrails/projected-liquid-cents.allowlist.json.',
      });
    }

    if (violations.length > 0) {
      fail(RULE, 'projectedLiquidCents is internal and allowlist-only', {
        details: violations.map(
          (violation) =>
            `${violation.file}:${violation.line}:${violation.col}: ${violation.token}`
        ),
        fix: FIX,
      });
    }

    process.stdout.write('check:projected-liquid-cents: ok\n');
  } catch (error: unknown) {
    fail(RULE, `Guardrail crashed: ${asMessage(error)}`, { fix: FIX });
  }
}

main();
