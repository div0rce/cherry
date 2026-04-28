import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';

const repoRoot = process.cwd();
const scanRoots = [
  path.join(repoRoot, 'lib', 'automation'),
  path.join(repoRoot, 'app', 'api', 'automation'),
  path.join(repoRoot, 'lib', 'adapters', 'runtime'),
];

function walk(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(full));
    } else if (entry.isFile() && /\.[cm]?ts$/.test(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

const forbiddenImports = [
  /from ['"][^'"]*\/engine(?:\/|\.js|['"])/,
  /from ['"][^'"]*\/authority(?:\/|\.js|['"])/,
  /from ['"][^'"]*lib\/engine/,
  /from ['"][^'"]*lib\/authority/,
  /import\(['"][^'"]*\/engine/,
  /import\(['"][^'"]*\/authority/,
];

const forbiddenFinanceMutationPatterns = [
  /\bprisma\.(sessions?|session|ledgers?|ledger|buckets?|bucket|cards?|card|payments?|payment|debts?|debt)\.(create|createMany|update|updateMany|upsert|delete|deleteMany)\b/i,
  /\/api\/(sessions?|ledgers?|buckets?|payments?|cards?)(\/|$)/i,
  /\/api\/debts?(\/.*)?\/mutate\b/i,
  /\b(Session|Ledger|Bucket|Card|Payment)\.(create|createMany|update|updateMany|upsert|delete|deleteMany)\b/,
];

const forbiddenDependencySpecifiers = [
  /(?:^|\/)(sessions?|ledgers?|buckets?|cards?|payments?|debts?)(?:\/|\.js|\.ts|$)/i,
  /buckets-runtime/i,
];

const importSpecifierPattern = /import(?:\s+type)?(?:[\s\S]*?\s+from\s+)?['"]([^'"]+)['"]/g;

const violations: string[] = [];
for (const root of scanRoots) {
  for (const file of walk(root)) {
    if (
      root.endsWith(path.join('lib', 'adapters', 'runtime')) &&
      !/^automation-.*\.[cm]?ts$/.test(path.basename(file))
    ) {
      continue;
    }
    const source = fs.readFileSync(file, 'utf8');
    if (forbiddenImports.some((pattern) => pattern.test(source))) {
      violations.push(`${path.relative(repoRoot, file)} imports engine/authority`);
    }
    if (forbiddenFinanceMutationPatterns.some((pattern) => pattern.test(source))) {
      violations.push(`${path.relative(repoRoot, file)} mutates or calls finance truth surface`);
    }
    for (const match of source.matchAll(importSpecifierPattern)) {
      const specifier = match[1] ?? '';
      if (forbiddenDependencySpecifiers.some((pattern) => pattern.test(specifier))) {
        violations.push(
          `${path.relative(repoRoot, file)} imports forbidden finance dependency ${specifier}`
        );
      }
    }
  }
}

assert.deepEqual(
  violations,
  [],
  'automation code must not import engine/authority or mutate finance truth surfaces'
);
console.warn('automation boundary: ok');
