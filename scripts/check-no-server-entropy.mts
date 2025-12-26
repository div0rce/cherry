import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ensureTsEsm } from './lib/ensure-ts-esm.ts';

ensureTsEsm();


type Violation = {
  file: string;
  line: number;
  col: number;
  message: string;
};

const ROOT = process.cwd();
const TARGET_DIRS = [path.join(ROOT, "app"), path.join(ROOT, "lib")];
const EXTENSIONS = new Set([".ts", ".tsx", ".js", ".mjs", ".cjs", ".mts"]);
const PRAGMA = "@server-entropy-allow";
const PRAGMA_FILE = "@server-entropy-allow-file";
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

const PATTERNS: { regex: RegExp; message: string }[] = [
  { regex: /new\s+Date\s*\(\s*\)/g, message: "Implicit time: new Date() forbidden; inject at boundary." },
  { regex: /Date\.now\s*\(\s*\)/g, message: "Implicit time: Date.now() forbidden; inject at boundary." },
  { regex: /performance\.now\s*\(\s*\)/g, message: "Implicit time: performance.now() forbidden; inject at boundary." },
  { regex: /Math\.random\s*\(\s*\)/g, message: "Randomness forbidden; inject rng/seed explicitly." },
  { regex: /crypto\.(randomUUID|getRandomValues|randomBytes)\s*\(/g, message: "Crypto randomness forbidden; inject rng/seed explicitly." },
  { regex: /\brandomUUID\s*\(/g, message: "Randomness forbidden; inject rng/seed explicitly." },
  { regex: /\bgetRandomValues\s*\(/g, message: "Randomness forbidden; inject rng/seed explicitly." },
  { regex: /\bheaders\s*\(/g, message: "Request headers access forbidden; pass values from boundary." },
  { regex: /\bcookies\s*\(/g, message: "Request cookies access forbidden; pass values from boundary." },
  { regex: /\bdraftMode\s*\(/g, message: "draftMode access forbidden; pass values from boundary." },
  { regex: /process\.env\b/g, message: "process.env access forbidden outside explicit boundary layers." },
];

function isExcludedPath(filePath: string): boolean {
  return EXCLUDED_PATH_PATTERNS.some((pattern) => filePath.includes(pattern));
}

function shouldSkipEntry(entryPath: string, isDirectory: boolean): boolean {
  if (isExcludedPath(entryPath)) return true;
  const relative = path.normalize(path.relative(ROOT, entryPath));
  const runtimePrefix = path.normalize(path.join("lib", "adapters", "runtime")) + path.sep;
  if (relative.startsWith(runtimePrefix)) return true;
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
    if (shouldSkipEntry(fullPath, entry.isDirectory())) {
      continue;
    }

    if (entry.isDirectory()) {
      files.push(...collectFiles(fullPath));
      continue;
    }

    if (!EXTENSIONS.has(path.extname(fullPath))) {
      continue;
    }

    files.push(fullPath);
  }

  return files;
}

function normalizePath(filePath: string): string {
  return path.normalize(path.relative(ROOT, filePath));
}

function isAllowlisted(filePath: string): boolean {
  const normalized = normalizePath(filePath);
  return ALLOWLIST.has(normalized);
}

function checkFile(filePath: string): Violation[] {
  if (isAllowlisted(filePath)) return [];

  const content = fs.readFileSync(filePath, "utf8");
  if (content.includes(PRAGMA_FILE)) {
    console.warn(`WARNING: ${normalizePath(filePath)} is fully exempted from server-entropy checks`);
    return [];
  }

  if (isClientFile(filePath, content)) return [];

  const sanitized = stripForScan(content);
  const lines = sanitized.split(/\r?\n/);
  const rawLines = content.split(/\r?\n/);
  const violations: Violation[] = [];

  lines.forEach((line, idx) => {
    if (rawLines[idx]?.includes(PRAGMA)) {
      return;
    }

    for (const pattern of PATTERNS) {
      pattern.regex.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = pattern.regex.exec(line)) !== null) {
        violations.push({
          file: normalizePath(filePath),
          line: idx + 1,
          col: match.index + 1,
          message: pattern.message,
        });
      }
    }
  });

  return violations;
}

function isClientFile(filePath: string, content: string): boolean {
  const base = path.basename(filePath).toLowerCase();
  if (
    base === "client.tsx" ||
    base === "client.ts" ||
    base.endsWith("client.tsx") ||
    base.endsWith("client.ts")
  ) {
    return true;
  }

  const firstNonEmpty = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.length > 0);

  return firstNonEmpty === "'use client'" || firstNonEmpty === '"use client"';
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

  console.warn("✅ Server entropy check passed: no forbidden nondeterminism in app/ or lib/");
}

main();
