import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

type Violation = { file: string; line: number; col: number; message: string };

const ROOT = process.cwd();
const TARGET_DIRS = [path.join(ROOT, "app"), path.join(ROOT, "lib")];
const EXTENSIONS = new Set([".ts", ".tsx", ".js", ".mjs", ".cjs", ".mts"]);
const PRAGMA_LINE = "@implicit-config-allow";
const PRAGMA_FILE = "@implicit-config-allow-file";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const allowlistPath = path.join(__dirname, "guardrails", "server-entropy.allowlist.json");
const allowlistData = globalThis.JSON.parse(fs.readFileSync(allowlistPath, "utf8")) as {
  files?: string[];
};
const ALLOWLIST = new Set((allowlistData.files ?? []).map((p) => path.normalize(p)));

const EXCLUDED_PATH_PATTERNS = [
  `${path.sep}app${path.sep}api${path.sep}`,
  `${path.sep}scripts${path.sep}`,
  `${path.sep}lib${path.sep}config${path.sep}from-env.ts`,
];

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

const PATTERNS: { regex: RegExp; message: string }[] = [
  {
    regex: /process\.env\b/g,
    message: "Implicit config forbidden — read environment only at API/script boundaries",
  },
  {
    regex: /\bNODE_ENV\b/g,
    message: "Implicit config forbidden — thread env-derived config explicitly",
  },
  {
    regex: /\bNEXT_PUBLIC_[A-Z0-9_]*\b/g,
    message: "Implicit config forbidden — thread env-derived config explicitly",
  },
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
  if (!fs.existsSync(dir)) return [];
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
  const normalizedPath = normalizePath(filePath);
  const isAllowlisted = ALLOWLIST.has(normalizedPath);

  if (isAllowlisted && !rawContent.includes(PRAGMA_FILE)) {
    console.warn(`WARNING: ${normalizedPath} is allowlisted for implicit-config checks`);
    return [];
  }

  if (rawContent.includes(PRAGMA_FILE)) {
    if (isAllowlisted) {
      console.warn(`WARNING: ${normalizedPath} is fully exempted from implicit-config checks`);
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
    for (const pattern of PATTERNS) {
      pattern.regex.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = pattern.regex.exec(line)) !== null) {
        if (!isAllowlisted && !rawContent.includes(PRAGMA_FILE)) {
          violations.push({
            file: normalizedPath,
            line: idx + 1,
            col: match.index + 1,
            message: pattern.message,
          });
        } else if (!rawLine.includes(PRAGMA_LINE) && !rawContent.includes(PRAGMA_FILE)) {
          violations.push({
            file: normalizedPath,
            line: idx + 1,
            col: match.index + 1,
            message: pattern.message,
          });
        }
      }
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

  console.warn("✅ Implicit config check passed: no forbidden env access in app/ or lib/");
}

main();
