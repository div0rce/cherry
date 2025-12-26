import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ensureTsEsm } from './lib/ensure-ts-esm.mts';

ensureTsEsm();


type Violation = { file: string; line: number; col: number; message: string };

const ROOT = process.cwd();
const TARGET_DIRS = [path.join(ROOT, "app"), path.join(ROOT, "lib")];
const EXTENSIONS = new Set([".ts", ".tsx", ".js", ".mjs", ".cjs", ".mts"]);
const PRAGMA_LINE = "@implicit-ordering-allow";
const PRAGMA_FILE = "@implicit-ordering-allow-file";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const allowlistPath = path.join(__dirname, "guardrails", "server-entropy.allowlist.json");
const allowlistData = globalThis.JSON.parse(fs.readFileSync(allowlistPath, "utf8")) as {
  files?: string[];
};
const ALLOWLIST = new Set((allowlistData.files ?? []).map((p) => path.normalize(p)));

const EXCLUDED_DIR_NAMES = new Set([
  "node_modules",
  ".next",
  "out",
  "build",
  "dist",
  "dist-scripts",
  "public",
  "data",
  "docs",
  "prisma",
  "scripts",
]);

const EXCLUDED_PATH_PATTERNS = [
  `${path.sep}app${path.sep}api${path.sep}`,
  `${path.sep}scripts${path.sep}`,
];

function isExcludedPath(filePath: string): boolean {
  return EXCLUDED_PATH_PATTERNS.some((pattern) => filePath.includes(pattern));
}

function shouldSkipEntry(entryPath: string, isDirectory: boolean): boolean {
  if (isExcludedPath(entryPath)) return true;
  if (!isDirectory) return false;
  const base = path.basename(entryPath);
  return EXCLUDED_DIR_NAMES.has(base);
}

function collectFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) {
    return [];
  }
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (shouldSkipEntry(fullPath, entry.isDirectory())) continue;
    if (entry.isDirectory()) {
      files.push(...collectFiles(fullPath));
      continue;
    }
    if (!EXTENSIONS.has(path.extname(fullPath))) continue;
    files.push(fullPath);
  }
  return files;
}

function normalizePath(filePath: string): string {
  return path.normalize(path.relative(ROOT, filePath));
}

function stripForScan(content: string): string {
  let result = "";
  let inSingle = false;
  let inDouble = false;
  let inTemplate = false;
  let inLineComment = false;
  let inBlockComment = false;
  let prevChar = "";

  for (let i = 0; i < content.length; i++) {
    const char = content[i] ?? "";
    const next = content[i + 1] ?? "";

    if (inLineComment) {
      if (char === "\n") {
        inLineComment = false;
        result += "\n";
      } else {
        result += " ";
      }
      prevChar = char;
      continue;
    }

    if (inBlockComment) {
      if (char === "*" && next === "/") {
        inBlockComment = false;
        result += "  ";
        i++;
        prevChar = "/";
        continue;
      }
      result += char === "\n" ? "\n" : " ";
      prevChar = char;
      continue;
    }

    if (!inSingle && !inDouble && !inTemplate) {
      if (char === "/" && next === "/") {
        inLineComment = true;
        result += "  ";
        i++;
        prevChar = "/";
        continue;
      }
      if (char === "/" && next === "*") {
        inBlockComment = true;
        result += "  ";
        i++;
        prevChar = "*";
        continue;
      }
    }

    if (!inSingle && !inDouble && char === "`" && !inTemplate) {
      inTemplate = true;
      result += "`";
      prevChar = char;
      continue;
    } else if (inTemplate && char === "`" && prevChar !== "\\") {
      inTemplate = false;
      result += "`";
      prevChar = char;
      continue;
    }

    if (!inDouble && !inTemplate && char === "'" && prevChar !== "\\") {
      inSingle = !inSingle;
      result += " ";
      prevChar = char;
      continue;
    }
    if (!inSingle && !inTemplate && char === '"' && prevChar !== "\\") {
      inDouble = !inDouble;
      result += " ";
      prevChar = char;
      continue;
    }

    if (inSingle || inDouble || inTemplate) {
      result += char === "\n" ? "\n" : " ";
    } else {
      result += char;
    }
    prevChar = char;
  }

  return result;
}

function checkFile(filePath: string): Violation[] {
  const rawContent = fs.readFileSync(filePath, "utf8");
  const isAllowlisted = ALLOWLIST.has(normalizePath(filePath));
  if (rawContent.includes(PRAGMA_FILE)) {
    if (isAllowlisted) {
      console.warn(`WARNING: ${normalizePath(filePath)} is fully exempted from implicit-ordering checks`);
      return [];
    }
  }

  const sanitized = stripForScan(rawContent);
  const lines = sanitized.split(/\r?\n/);
  const rawLines = rawContent.split(/\r?\n/);
  const violations: Violation[] = [];

  lines.forEach((line, idx) => {
    const rawLine = rawLines[idx] ?? "";
    if (isAllowlisted && rawLine.includes(PRAGMA_LINE)) {
      return;
    }

    // .sort() with no comparator
    let match: RegExpExecArray | null;
    const sortNoComparator = /\.sort\s*\(\s*\)/g;
    sortNoComparator.lastIndex = 0;
    while ((match = sortNoComparator.exec(line)) !== null) {
      violations.push({
        file: normalizePath(filePath),
        line: idx + 1,
        col: match.index + 1,
        message: 'Implicit ordering forbidden — sort() requires a total comparator',
      });
    }

    // Comparator likely returning boolean (>,<) without equality handling
    const sortComparator = /\.sort\s*\(\s*\([^)]*\)\s*=>\s*([^;{]+)\)/g;
    sortComparator.lastIndex = 0;
    while ((match = sortComparator.exec(line)) !== null) {
      const body = match[1] ?? '';
      const usesInequality = /[<>]=?/.test(body);
      const hasEquality = /0|localeCompare|===|!==|\|\|/.test(body);
      if (usesInequality && !hasEquality) {
        violations.push({
          file: normalizePath(filePath),
          line: idx + 1,
          col: match.index + 1,
          message: 'Implicit ordering forbidden — comparator must handle equality deterministically',
        });
      }
    }

    // Object.keys without sorting
    const objKeys = /Object\.keys\s*\([^)]*\)(?!\s*\.sort)/g;
    objKeys.lastIndex = 0;
    while ((match = objKeys.exec(line)) !== null) {
      violations.push({
        file: normalizePath(filePath),
        line: idx + 1,
        col: match.index + 1,
        message: 'Implicit ordering forbidden — Object.keys results must be sorted before use',
      });
    }
  });

  return violations;
}

function main(): void {
  const files = TARGET_DIRS.flatMap((dir) => collectFiles(dir));
  const violations: Violation[] = [];

  for (const file of files) {
    violations.push(...checkFile(file));
  }

  if (violations.length > 0) {
    for (const violation of violations) {
      console.error(`${violation.file}:${violation.line}:${violation.col}: ${violation.message}`);
    }
    process.exit(1);
  }

  console.warn("✅ Implicit ordering check passed: no forbidden patterns in app/ or lib/");
}

main();
