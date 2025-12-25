import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';

type Violation = {
  file: string;
  effects: string[];
};

type AllowlistSource = 'legacy' | 'adapter' | 'boundary';

type AllowlistEntry = {
  effects: string[];
  source: AllowlistSource;
};

const ROOT = process.cwd();
const TARGET = path.join(ROOT, 'lib');
const ALLOWLIST_PATH = path.join(ROOT, 'scripts', 'side-effects.allowlist.json');
const AllowlistEntrySchema = z
  .object({
    effects: z.array(z.string()),
    source: z.enum(['legacy', 'adapter', 'boundary']),
  })
  .strict();
const AllowlistSchema = z.record(z.string(), AllowlistEntrySchema);

const SIDE_EFFECT_PATTERNS: Record<string, RegExp> = {
  console: /\bconsole\./,
  env: /\bprocess\.env\b/,
  prisma: /\bprisma\.|\bgetPrisma\s*\(/,
  fetch: /\bfetch\s*\(/,
  fs: /\bfs\./,
  path: /\bpath\./,
  crypto: /\bcrypto\./,
  next_redirect: /\bredirect\s*\(/,
  next_revalidate: /\brevalidatePath\s*\(/,
  next_headers: /\bheaders\s*\(/,
  next_cookies: /\bcookies\s*\(/,
  time: /\bnew Date\s*\(|\bDate\.now\s*\(/,
  random: /\bMath\.random\s*\(/,
};

const IGNORED_DIR_NAMES = new Set([
  'node_modules',
  '.git',
  '.next',
  'out',
  'build',
  'dist',
  'dist-scripts',
  'coverage',
]);

const ADAPTER_DIR = path.normalize(path.join('lib', 'adapters')) + path.sep;

function shouldSkipDir(fullPath: string): boolean {
  const parts = fullPath.split(path.sep);
  if (parts.includes('__tests__')) return true;
  if (parts.includes('__mocks__')) return true;
  const base = path.basename(fullPath);
  return IGNORED_DIR_NAMES.has(base);
}

function isAdapterFile(filePath: string): boolean {
  const normalized = path.normalize(filePath);
  return normalized.startsWith(ADAPTER_DIR);
}

function walk(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (shouldSkipDir(fullPath)) continue;
      files.push(...walk(fullPath));
    } else {
      files.push(fullPath);
    }
  }
  return files;
}

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

function collectViolations(filePath: string): Violation | null {
  const content = fs.readFileSync(filePath, 'utf8');
  const sanitized = stripForScan(content);
  const effects: string[] = [];
  for (const [label, regex] of Object.entries(SIDE_EFFECT_PATTERNS)) {
    if (regex.test(sanitized)) {
      effects.push(label);
    }
  }
  if (effects.length === 0) return null;
  effects.sort();
  const relative = path.normalize(path.relative(ROOT, filePath));
  return { file: relative, effects };
}

function loadAllowlist(): Record<string, AllowlistEntry> {
  if (!fs.existsSync(ALLOWLIST_PATH)) {
    throw new Error(`Side-effects allowlist missing at ${path.relative(ROOT, ALLOWLIST_PATH)}`);
  }
  const data = fs.readFileSync(ALLOWLIST_PATH, 'utf8');
  const parsed = AllowlistSchema.parse(globalThis.JSON.parse(data));
  const normalized: Record<string, AllowlistEntry> = {};
  const entries = Object.entries(parsed) as Array<[string, AllowlistEntry]>;
  for (const [key, entry] of entries) {
    normalized[path.normalize(key)] = {
      effects: entry.effects.slice().sort(),
      source: entry.source,
    };
  }
  return normalized;
}

function main(): void {
  const writeAllowlist = process.argv.includes('--write-allowlist');
  const files = walk(TARGET);
  const violations: Violation[] = [];

  for (const file of files) {
    const violation = collectViolations(file);
    if (violation !== null) {
      violations.push(violation);
    }
  }

  violations.sort((a, b) => a.file.localeCompare(b.file));

  if (writeAllowlist) {
    const allowlist: Record<string, AllowlistEntry> = {};
    for (const v of violations) {
      allowlist[v.file] = { effects: v.effects, source: 'legacy' };
    }
    const json = `${JSON.stringify(allowlist, null, 2)}\n`;
    fs.writeFileSync(ALLOWLIST_PATH, json, 'utf8');
    console.warn(`Wrote side-effects allowlist to ${path.relative(ROOT, ALLOWLIST_PATH)}`);
    process.exit(0);
  }

  const allowlist = loadAllowlist();
  const allowlistedWarnings: string[] = [];
  const errors: string[] = [];

  const violationMap = new Map(violations.map((v) => [v.file, v]));

  for (const violation of violations) {
    if (isAdapterFile(violation.file)) {
      if (allowlist[violation.file]) {
        errors.push(`${violation.file}: adapters must not be listed in the allowlist`);
      }
      continue;
    }
    const entry = allowlist[violation.file];
    if (!entry) {
      errors.push(`${violation.file}: ${violation.effects.join(', ')}`);
      continue;
    }
    if (entry.source !== 'legacy') {
      errors.push(`${violation.file}: non-legacy side effects are forbidden outside adapters`);
      continue;
    }
    const missing = violation.effects.filter((e) => !entry.effects.includes(e));
    if (missing.length > 0) {
      errors.push(`${violation.file}: ${missing.join(', ')}`);
    } else {
      allowlistedWarnings.push(
        `${violation.file}: allowlisted ${entry.source} side effects (${entry.effects.join(', ')})`
      );
    }
  }

  for (const [file, entry] of Object.entries(allowlist)) {
    if (isAdapterFile(file)) {
      errors.push(`${file}: adapters must not be listed in the allowlist`);
      continue;
    }
    if (!violationMap.has(file)) {
      errors.push(`${file}: stale allowlist entry (${entry.effects.join(', ')})`);
    }
  }

  if (allowlistedWarnings.length > 0) {
    for (const warn of allowlistedWarnings) {
      console.warn(warn);
    }
  }

  if (errors.length > 0) {
    for (const err of errors) {
      console.error(err);
    }
    process.exit(1);
  }

  console.warn('check-no-side-effects: ok');
}

main();
