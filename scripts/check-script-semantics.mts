import * as fs from "node:fs";
import * as path from "node:path";
import fg from "fast-glob";
import { z } from 'zod';
import { ensureTsEsm } from './lib/ensure-ts-esm.mjs';
import { parseJson } from './guardrails/lib/read-json.mjs';
import { asMessage } from './guardrails/lib/error.mjs';
import { fail } from './guardrails/lib/fail.mjs';

ensureTsEsm();


type Violation = {
  file: string;
  message: string;
};

const ROOT = process.cwd();
const PREFIX = 'check:script-semantics';
const FIX = 'Move .mts files under scripts/ and keep runtime code .ts.';
const SCRIPT_GLOB = "scripts/**/*.{ts,mts}";
const MTS_GLOB = "**/*.mts";
const IGNORE = [
  "**/node_modules/**",
  "**/.git/**",
  "**/.next/**",
  "**/dist/**",
  "**/build/**",
  "**/out/**",
  "**/coverage/**",
  "**/dist-scripts/**",
  "**/.tmp/**",
  "**/tests/fixtures/**",
];

const PackageJsonSchema = z
  .object({
    type: z.string().optional(),
  })
  .passthrough();

function normalizePath(filePath: string): string {
  return path.normalize(path.relative(ROOT, filePath));
}

function stripForSyntax(content: string): string {
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
    if (!inSingle && !inDouble && char === "`" && prevChar !== "\\") {
      inTemplate = !inTemplate;
      result += " ";
      prevChar = char;
      continue;
    }
    if (inTemplate && char === "`" && prevChar !== "\\") {
      inTemplate = false;
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

function stripComments(content: string): string {
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

    if (!inDouble && !inTemplate && char === "'" && prevChar !== "\\") {
      inSingle = !inSingle;
      result += char;
      prevChar = char;
      continue;
    }
    if (!inSingle && !inTemplate && char === '"' && prevChar !== "\\") {
      inDouble = !inDouble;
      result += char;
      prevChar = char;
      continue;
    }
    if (!inSingle && !inDouble && char === "`" && prevChar !== "\\") {
      inTemplate = !inTemplate;
      result += char;
      prevChar = char;
      continue;
    }
    if (inTemplate && char === "`" && prevChar !== "\\") {
      inTemplate = false;
      result += char;
      prevChar = char;
      continue;
    }

    result += char;
    prevChar = char;
  }

  return result;
}

function checkNoImplicitEsm(filePath: string, violations: Violation[]): void {
  if (filePath.endsWith(".d.ts")) return;
  const content = fs.readFileSync(filePath, "utf8");
  const sanitized = stripForSyntax(content);
  const hasImport = /\bimport\s+/.test(sanitized);
  const hasExport = /\bexport\s+/.test(sanitized);
  const hasImportMeta = /\bimport\.meta\b/.test(sanitized);
  const hasAwait = /\bawait\b/.test(sanitized);

  if (hasImport || hasExport || hasImportMeta || hasAwait) {
    const relative = normalizePath(filePath);
    violations.push({
      file: relative,
      message: `${relative} uses ESM syntax but is .ts. Rename to .mts or rewrite as CJS.`,
    });
  }
}

function checkRequireUsage(filePath: string, violations: Violation[]): void {
  const content = fs.readFileSync(filePath, "utf8");
  const stripped = stripComments(content);
  const usesRequire = /\brequire\s*\(/.test(stripped);
  const hasCreateRequire = /createRequire\s*\(\s*import\.meta\.url\s*\)/.test(stripped);
  if (usesRequire && !hasCreateRequire) {
    const relative = normalizePath(filePath);
    violations.push({
      file: relative,
      message: `${relative} uses require() without createRequire(). Use createRequire(import.meta.url) explicitly.`,
    });
  }
}

function checkPackageType(violations: Violation[]): void {
  const packagePath = path.join(ROOT, "package.json");
  const data = fs.readFileSync(packagePath, "utf8");
  let parsedType: string | undefined;
  try {
    parsedType = PackageJsonSchema.parse(parseJson(data)).type;
  } catch (err: unknown) {
    void asMessage(err);
    parsedType = undefined;
  }
  if (parsedType !== "module") {
    violations.push({
      file: "package.json",
      message:
        "Root package.json must be ESM. Script semantics are defined by extension only.",
    });
  }
}

function checkMtsLocations(violations: Violation[]): void {
  const mtsFiles = fg.sync(MTS_GLOB, { cwd: ROOT, absolute: true, ignore: IGNORE });
  for (const file of mtsFiles) {
    const relative = normalizePath(file);
    if (!relative.startsWith(`scripts${path.sep}`)) {
      violations.push({
        file: relative,
        message: ".mts files are restricted to scripts/. Runtime code must remain .ts.",
      });
      return;
    }
  }
}

function main(): void {
  const violations: Violation[] = [];

  checkPackageType(violations);
  checkMtsLocations(violations);

  const scriptFiles = fg.sync(SCRIPT_GLOB, { cwd: ROOT, absolute: true, ignore: IGNORE });

  for (const file of scriptFiles) {
    const relative = normalizePath(file);
    if (relative.startsWith(`scripts${path.sep}lib${path.sep}`) && file.endsWith(".ts")) {
      violations.push({
        file: relative,
        message: "scripts/lib must use .mts to guarantee ESM semantics.",
      });
      continue;
    }
    if (file.endsWith(".ts")) {
      checkNoImplicitEsm(file, violations);
    } else if (file.endsWith(".mts")) {
      checkRequireUsage(file, violations);
    }
  }

  if (violations.length > 0) {
    const details = violations.map((violation) => violation.message);
    fail(PREFIX, 'Script semantics violations detected', { details, fix: FIX });
  }

  process.stdout.write("check-script-semantics: ok\n");
}

try {
  main();
} catch (error: unknown) {
  const message = asMessage(error);
  fail(PREFIX, `Guardrail crashed: ${message}`, { fix: FIX });
}
