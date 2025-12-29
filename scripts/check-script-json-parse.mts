import fs from 'node:fs';
import path from 'node:path';
import fg from 'fast-glob';
import { ensureTsEsm } from './lib/ensure-ts-esm.mts';
import { asMessage } from './guardrails/lib/error.mts';
import { fail } from './guardrails/lib/fail.mts';

ensureTsEsm();

type Violation = {
  file: string;
  line: number;
  col: number;
  token: string;
};

const ROOT_ENV = process.env['CHERRY_SCRIPT_JSON_PARSE_ROOT'];
const ROOT = ROOT_ENV !== undefined && ROOT_ENV !== ''
  ? path.resolve(ROOT_ENV)
  : process.cwd();
const SCRIPT_GLOB = 'scripts/**/*.{ts,mts,cts}';
const IGNORE = [
  '**/node_modules/**',
  '**/.git/**',
  '**/.next/**',
  '**/dist/**',
  '**/build/**',
  '**/out/**',
  '**/coverage/**',
  '**/dist-scripts/**',
];
const ALLOWLIST = new Set([path.join(ROOT, 'scripts', 'guardrails', 'lib', 'read-json.mts')]);
const RULE = 'check:script-json-parse';
const FIX = 'Use readJsonFile/parseJson from scripts/guardrails/lib/read-json.mts.';

const TOKENS: Array<{ regex: RegExp; token: string }> = [
  { regex: /\bglobalThis\s*\.\s*JSON\s*\.\s*parse\b/, token: 'globalThis.JSON.parse' },
  { regex: /\bJSON\s*\.\s*parse\b/, token: 'JSON.parse' },
  { regex: /\bjsonParse\b/, token: 'jsonParse' },
];

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

function main(): void {
  try {
    const files = fg.sync(SCRIPT_GLOB, {
      dot: true,
      ignore: IGNORE,
      absolute: true,
      cwd: ROOT,
    });
    const violations: Violation[] = [];

    for (const filePath of files) {
      if (ALLOWLIST.has(filePath)) continue;
      if (!fs.existsSync(filePath)) continue;
      const content = fs.readFileSync(filePath, 'utf8');
      const scanned = stripForScan(content);
      for (const token of TOKENS) {
        const index = scanned.search(token.regex);
        if (index !== -1) {
          const { line, col } = lineColForIndex(scanned, index);
          violations.push({
            file: normalizePath(filePath),
            line,
            col,
            token: token.token,
          });
          break;
        }
      }
    }

    if (violations.length > 0) {
      const details = violations.map(
        (violation) =>
          `${violation.file}:${violation.line}:${violation.col}: ${violation.token}`
      );
      fail(RULE, 'JSON.parse is forbidden in scripts', { details, fix: FIX });
    }

    process.stdout.write('script-json-parse: ok\n');
  } catch (error: unknown) {
    const message = asMessage(error);
    fail(RULE, `Guardrail crashed: ${message}`, { fix: FIX });
  }
}

main();
