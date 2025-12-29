import fs from 'node:fs';
import path from 'node:path';
import fg from 'fast-glob';
import { ensureTsEsm } from './lib/ensure-ts-esm.mts';

ensureTsEsm();


type Violation = {
  file: string;
  message: string;
};

const ROOT = process.cwd();
const TARGETS = [
  'lib/engine/**/*.{ts,tsx,js,jsx}',
  'lib/authority/**/*.{ts,tsx,js,jsx}',
];
const IGNORE = ['**/__tests__/**', '**/__mocks__/**'];

const PATTERNS: Array<{ message: string; regex: RegExp }> = [
  { message: 'uses Date constructor or type', regex: /\bDate\b/ },
];

function stripForScan(content: string): string {
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
    } else {
      result += char;
    }
    prevChar = char;
  }

  return result;
}

function scanFile(filePath: string): Violation[] {
  const content = fs.readFileSync(filePath, 'utf8');
  const sanitized = stripForScan(content);
  const relative = path.normalize(path.relative(ROOT, filePath));
  const violations: Violation[] = [];

  for (const pattern of PATTERNS) {
    if (pattern.regex.test(sanitized)) {
      violations.push({ file: relative, message: pattern.message });
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
    for (const violation of violations) {
      console.error(`${violation.file}: ${violation.message}`);
    }
    process.exit(1);
  }

  console.warn('check-engine-date: ok');
}

main();
