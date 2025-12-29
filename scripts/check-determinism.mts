import fs from "node:fs";
import path from "node:path";
import { ensureTsEsm } from './lib/ensure-ts-esm.mts';
import { asMessage } from './guardrails/lib/error.mts';
import { fail } from './guardrails/lib/fail.mts';

ensureTsEsm();


type Violation = {
  file: string;
  line: number;
  col: number;
  message: string;
};

const ROOT = process.cwd();
const PREFIX = 'check:determinism';
const FIX = 'Inject time into lib/ or add @time-allow markers where permitted.';
const TARGET_DIR = path.join(ROOT, "lib");
const ALLOWLIST_PATHS: Set<string> = new Set([
  // keep minimal; add explicit paths only if metrics-only timestamps are required.
]);
const PRAGMA = "@time-allow: metrics-only";

function isAllowlisted(filePath: string, line: string): boolean {
  if (ALLOWLIST_PATHS.has(filePath)) return true;
  return line.includes(PRAGMA);
}

function collectFiles(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const relative = path.normalize(path.relative(ROOT, fullPath));
      const runtimePrefix = path.normalize(path.join("lib", "adapters", "runtime"));
      if (relative === runtimePrefix || relative.startsWith(`${runtimePrefix}${path.sep}`)) {
        continue;
      }
      files.push(...collectFiles(fullPath));
    } else {
      files.push(fullPath);
    }
  }
  return files;
}

function checkFile(filePath: string): Violation[] {
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split(/\r?\n/);
  const violations: Violation[] = [];
  const newDateRegex = /new\s+Date\s*\(\s*\)/g;
  const dateNowRegex = /Date\.now\s*\(\s*\)/g;
  const perfNowRegex = /performance\.now\s*\(\s*\)/g;

  lines.forEach((line, idx) => {
    if (isAllowlisted(filePath, line)) {
      return;
    }

    let match: RegExpExecArray | null;
    newDateRegex.lastIndex = 0;
    while ((match = newDateRegex.exec(line)) !== null) {
      violations.push({
        file: filePath,
        line: idx + 1,
        col: match.index + 1,
        message: "Implicit time detected: new Date()",
      });
    }

    dateNowRegex.lastIndex = 0;
    while ((match = dateNowRegex.exec(line)) !== null) {
      violations.push({
        file: filePath,
        line: idx + 1,
        col: match.index + 1,
        message: "Implicit time detected: Date.now()",
      });
    }

    perfNowRegex.lastIndex = 0;
    while ((match = perfNowRegex.exec(line)) !== null) {
      violations.push({
        file: filePath,
        line: idx + 1,
        col: match.index + 1,
        message: "Implicit time detected: performance.now()",
      });
    }
  });

  return violations;
}

function main(): void {
  if (!fs.existsSync(TARGET_DIR)) {
    fail(PREFIX, 'Target directory not found', {
      details: [path.relative(ROOT, TARGET_DIR) + ':1:1: missing'],
      fix: FIX,
    });
  }

  const files = collectFiles(TARGET_DIR);
  const violations: Violation[] = [];

  for (const file of files) {
    violations.push(...checkFile(file));
  }

  if (violations.length > 0) {
    const details = violations.map(
      (violation) =>
        `${path.relative(ROOT, violation.file)}:${violation.line}:${violation.col}: ${violation.message}`
    );
    fail(PREFIX, 'Determinism violations detected', { details, fix: FIX });
  }

  process.stdout.write("✅ Determinism check passed: no implicit time in lib/\n");
}

try {
  main();
} catch (error: unknown) {
  const message = asMessage(error);
  fail(PREFIX, `Guardrail crashed: ${message}`, { fix: FIX });
}
