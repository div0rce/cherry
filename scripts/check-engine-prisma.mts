import * as fs from 'node:fs';
import * as path from 'node:path';
import fg from 'fast-glob';
import { ensureTsEsm } from './lib/ensure-ts-esm.mjs';
import { asMessage } from './guardrails/lib/error.mjs';
import { fail } from './guardrails/lib/fail.mjs';
import { resolveRootArg } from './lib/root-arg.mjs';

ensureTsEsm();


type Violation = {
  file: string;
  line: number;
  col: number;
  message: string;
};

const ROOT = resolveRootArg(process.argv);
const PREFIX = 'check:engine-prisma';
const FIX = 'Remove Prisma usage from engine code and use adapters instead.';
const TARGETS = [
  'lib/engine/**/*.{ts,tsx,js,jsx}',
  'lib/authority/**/*.{ts,tsx,js,jsx}',
];
const IGNORE = ['**/__tests__/**', '**/__mocks__/**', '**/.tmp/**'];

// Import patterns run against comment-stripped source (string literals survive); usage patterns
// run against comment/string-stripped source. `import type` from @prisma/client is allowed (types only).
// `LOADS` covers side-effect imports, dynamic imports and require calls. The lib/prisma pattern matches
// any specifier ending in `/prisma` (e.g. '../prisma.js'), since engine and authority are siblings
// of lib/prisma.ts and import it relatively.
const LOADS = String.raw`(?:^\s*import\s+|\bimport\s*\(\s*|\brequire\s*\(\s*)`;
const IMPORT_PATTERNS: Array<{ message: string; regex: RegExp }> = [
  {
    message: "value-imports '@prisma/client'",
    regex: /^\s*(?:import|export)\s+(?!type\b)[^;]*?\bfrom\s+['"]@prisma\/client['"]/m,
  },
  { message: "loads '@prisma/client'", regex: new RegExp(`${LOADS}['"]@prisma/client['"]`, 'm') },
  {
    message: 'imports lib/prisma',
    regex: new RegExp(String.raw`(?:\bfrom\s+|${LOADS})['"][^'"]*/prisma(?:\.[cm]?[jt]s)?['"]`, 'm'),
  },
];
const USAGE_PATTERNS: Array<{ message: string; regex: RegExp }> = [
  { message: 'uses prisma client', regex: /\bprisma\s*\./ },
  { message: 'calls getPrisma()', regex: /\bgetPrisma\s*\(/ },
];

// Blanks comments always and string contents unless keepStrings (import patterns need the
// specifier text; usage patterns must not match inside strings).
function stripForScan(content: string, keepStrings: boolean): string {
  let result = '';
  let inSingle = false;
  let inDouble = false;
  let inTemplate = false;
  let inLineComment = false;
  let inBlockComment = false;
  let prevChar = '';

  for (let i = 0; i < content.length; i++) {
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
        i++;
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
        i++;
        prevChar = '/';
        continue;
      }
      if (char === '/' && next === '*') {
        inBlockComment = true;
        result += '  ';
        i++;
        prevChar = '*';
        continue;
      }
    }

    if (!inDouble && !inTemplate && char === "'" && prevChar !== '\\') {
      inSingle = !inSingle;
      result += keepStrings ? char : ' ';
      prevChar = char;
      continue;
    }
    if (!inSingle && !inTemplate && char === '"' && prevChar !== '\\') {
      inDouble = !inDouble;
      result += keepStrings ? char : ' ';
      prevChar = char;
      continue;
    }
    if (!inSingle && !inDouble && char === '`' && prevChar !== '\\') {
      inTemplate = !inTemplate;
      result += keepStrings ? char : ' ';
      prevChar = char;
      continue;
    }
    if (inTemplate && char === '`' && prevChar !== '\\') {
      inTemplate = false;
      result += keepStrings ? char : ' ';
      prevChar = char;
      continue;
    }

    if ((inSingle || inDouble || inTemplate) && !keepStrings) {
      result += char === '\n' ? '\n' : ' ';
    } else {
      result += char;
    }
    prevChar = char;
  }

  return result;
}

function scanFile(filePath: string): Violation[] {
  const content = fs.readFileSync(filePath, 'utf8');
  const commentFree = stripForScan(content, true);
  const sanitized = stripForScan(content, false);
  const relative = path.normalize(path.relative(ROOT, filePath));
  const violations: Violation[] = [];

  const scans: Array<{ text: string; patterns: Array<{ message: string; regex: RegExp }> }> = [
    { text: commentFree, patterns: IMPORT_PATTERNS },
    { text: sanitized, patterns: USAGE_PATTERNS },
  ];
  for (const { text, patterns } of scans) {
    for (const pattern of patterns) {
      const index = text.search(pattern.regex);
      if (index === -1) continue;
      const slice = text.slice(0, index);
      const line = slice.split('\n').length;
      const lastNewline = slice.lastIndexOf('\n');
      const col = lastNewline === -1 ? index + 1 : index - lastNewline;
      violations.push({ file: relative, line, col, message: pattern.message });
    }
  }

  return violations;
}

function main(): void {
  const files = fg.sync(TARGETS, { cwd: ROOT, absolute: true, ignore: IGNORE }).sort();
  const violations: Violation[] = [];

  for (const file of files) {
    violations.push(...scanFile(file));
  }

  if (violations.length > 0) {
    const details = violations.map(
      (violation) => `${violation.file}:${violation.line}:${violation.col}: ${violation.message}`
    );
    fail(PREFIX, 'Engine prisma violations detected', { details, fix: FIX });
  }

  process.stdout.write('check-engine-prisma: ok\n');
}

try {
  main();
} catch (error: unknown) {
  const message = asMessage(error);
  fail(PREFIX, `Guardrail crashed: ${message}`, { fix: FIX });
}
