import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { readTsConfig } from './lib/read-tsconfig.mts';
import { ensureTsEsm } from './lib/ensure-ts-esm.mts';
import { readJsonFile } from './guardrails/lib/read-json.mts';
import { asMessage } from './guardrails/lib/error.mts';
import { fail } from './guardrails/lib/fail.mts';

ensureTsEsm();

const PREFIX = 'check:guardrails-core';
const DEFAULT_FIX = 'Restore guardrail enforcement in ESLint and tsconfig.';

const PackageJsonSchema = z
  .object({
    scripts: z.record(z.string(), z.string()).optional(),
  })
  .passthrough();

function assertEslintRules(): void {
  const eslintPath = path.join(process.cwd(), 'eslint.config.mjs');
  if (!fs.existsSync(eslintPath)) {
    fail(PREFIX, 'eslint.config.mjs missing', { fix: DEFAULT_FIX });
  }
  const legacyConfigs = ['.eslintrc', '.eslintrc.js', '.eslintrc.cjs', '.eslintrc.json', '.eslintrc.yml', '.eslintrc.yaml'];
  legacyConfigs.forEach((file) => {
    if (fs.existsSync(path.join(process.cwd(), file))) {
      fail(PREFIX, `Legacy ESLint config ${file} must not exist; use eslint.config.mjs only.`, {
        fix: DEFAULT_FIX,
      });
    }
  });
  const text = fs.readFileSync(eslintPath, 'utf8');
  const requiredSnippets = [
    "zod/prefer-enum': 'error'",
    "zod/require-strict': 'error'",
    "@typescript-eslint/no-floating-promises': 'error'",
    "@typescript-eslint/no-misused-promises': [\n        'error'",
    "@typescript-eslint/no-explicit-any': 'error'",
    "@typescript-eslint/no-unsafe-assignment': 'error'",
    "@typescript-eslint/no-unsafe-member-access': 'error'",
    "@typescript-eslint/no-unsafe-call': 'error'",
    "@typescript-eslint/no-unsafe-return': 'error'",
    "@typescript-eslint/no-unsafe-argument': 'error'",
    "@typescript-eslint/no-unused-vars': ['error'",
    "@typescript-eslint/explicit-module-boundary-types': 'error'",
    "@next/next/no-img-element': 'off'",
    "selector: 'CallExpression[callee.object.name=\"JSON\"][callee.property.name=\"parse\"]'",
  ];
  requiredSnippets.forEach((snippet) => {
    if (!text.includes(snippet)) {
      fail(PREFIX, `ESLint guardrail missing: ${snippet}`, { fix: DEFAULT_FIX });
    }
  });

  const strictBooleanTokens = [
    "['error'",
    'allowString: false',
    'allowNumber: false',
    'allowNullableObject: true',
    'allowNullableBoolean: true',
    'allowNullableString: false',
    'allowNullableNumber: false',
    'allowAny: false',
  ];
  strictBooleanTokens.forEach((token) => {
    if (!text.includes(token)) {
      fail(PREFIX, `Strict boolean expressions config missing token: ${token}`, {
        fix: DEFAULT_FIX,
      });
    }
  });
}

function assertNoNewEslintDisables(): void {
  const guardrailSelfPath = path.join('scripts', 'check-guardrails-core.mts');
  const allowList = new Set([
    'lib/logger.ts',
    'scripts/debug-bucket-balance.mts',
    'lib/unified-activity.ts',
    'scripts/ingest-moustafa-bank-csv.mts',
    guardrailSelfPath,
    'tests/engine-solver.test.js',
    'tests/vine-security.test.js',
    'tests/offline-evaluator-regimes.test.js',
    'tests/sessions-bucket-reversal.test.js',
    'tests/vine-order.test.js',
    'tests/bank-ingest.test.js',
    'tests/wallet-pass-config.test.js',
    'tests/bank-ingest-idempotent.test.js',
    'tests/api-simulate.user-context.test.js',
    'tests/engine-objective.test.js',
    'tests/verification-session.test.js',
    'tests/engine-invariants.test.js',
    'tests/api-sessions.user-context.test.js',
    'tests/offline-evaluator-basic.test.js',
    'tests/run-recommendation.user-context.test.js',
    'tests/income-classifier.test.js',
    'tests/income-regimes.test.js',
    'tests/offline-evaluator-prisma-guard.test.js',
    'tests/client-api.test.js',
    'tests/user-context.test.js',
    'tests/api-vine-order.user-context.test.js',
    'tests/api-scan.user-context.test.js',
    'tests/vine-order-security.test.js',
    'tests/bucket-regimes.test.js',
    'tests/category-preference-enum.test.js',
    'tests/simulation-adapter.test.js',
    'tests/engine-bucket-remaining.test.js',
    'tests/buckets-periods.test.js',
  ]);

  const scanDirs = ['app', 'lib', 'scripts', 'tests'];
  for (const dir of scanDirs) {
    const dirPath = path.join(process.cwd(), dir);
    if (!fs.existsSync(dirPath)) continue;
    const files = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of files) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        scanDirs.push(path.relative(process.cwd(), fullPath));
        continue;
      }
      const relPath = path.relative(process.cwd(), fullPath);
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('eslint-disable')) {
        if (!allowList.has(relPath)) {
          fail(PREFIX, `New eslint-disable found in ${relPath}. Fix code instead of disabling rules.`, {
            fix: DEFAULT_FIX,
          });
        }
      }
    }
  }
}

function assertTsconfigStrict(): void {
  const requiredTrueFlags = [
    'strict',
    'noImplicitAny',
    'noImplicitThis',
    'strictNullChecks',
    'strictFunctionTypes',
    'strictBindCallApply',
    'noImplicitOverride',
    'noImplicitReturns',
    'noFallthroughCasesInSwitch',
    'noUncheckedIndexedAccess',
    'noPropertyAccessFromIndexSignature',
    'exactOptionalPropertyTypes',
    'useUnknownInCatchVariables',
  ];
  const tsconfigPath = path.join(process.cwd(), 'tsconfig.json');
  const tsconfig = readTsConfig(tsconfigPath);
  const compilerOptions = tsconfig.options;
  requiredTrueFlags.forEach((flag) => {
    if ((compilerOptions as Record<string, unknown>)[flag] !== true) {
      fail(PREFIX, `tsconfig compilerOptions.${flag} must be true`, { fix: DEFAULT_FIX });
    }
  });
}

function assertPackageScripts(): void {
  const pkgPath = path.join(process.cwd(), 'package.json');
  let pkg: z.infer<typeof PackageJsonSchema>;
  try {
    pkg = PackageJsonSchema.parse(readJsonFile(pkgPath));
  } catch (err: unknown) {
    fail(PREFIX, `Failed to read JSON file ${pkgPath}: ${asMessage(err)}`, { fix: DEFAULT_FIX });
  }
  const scripts = pkg.scripts;
  if (scripts === undefined) fail(PREFIX, 'package.json missing scripts', { fix: DEFAULT_FIX });
  const requiredScripts = [
    'lint',
    'lint:eslint',
    'lint:tailwind',
    'typecheck',
    'typecheck:scripts',
    'check',
    'check:prisma-assumptions',
    'check:guardrails',
    'test',
    'dev:ingest:moustafa-bank',
    'dev:evaluator:moustafa',
  ];
  requiredScripts.forEach((name) => {
    if (typeof scripts[name] !== 'string') {
      fail(PREFIX, `package.json scripts missing ${name}`, { fix: DEFAULT_FIX });
    }
  });
  const lintScript = scripts['lint'] as string;
  if (!lintScript.includes('lint:tailwind') || !lintScript.includes('lint:eslint')) {
    fail(PREFIX, 'lint script must run lint:tailwind and lint:eslint', { fix: DEFAULT_FIX });
  }
  const testScript = scripts['test'] as string;
  if (!testScript.includes('check:guardrails')) {
    fail(PREFIX, 'test script must include check:guardrails', { fix: DEFAULT_FIX });
  }
}

function assertPrismaAssumptions(): void {
  const filePath = path.join(process.cwd(), 'scripts', 'check-prisma-assumptions.mts');
  if (!fs.existsSync(filePath)) {
    const relative = path.join('scripts', 'check-prisma-assumptions.mts');
    fail(PREFIX, `${relative} missing`, { fix: DEFAULT_FIX });
  }
}

function assertCriticalFilesExist(): void {
  const requiredFiles = [
    'lib/evaluator/offline-history.ts',
    'lib/evaluator/stats.ts',
    'lib/bank/ingest.ts',
    'scripts/ingest-moustafa-bank-csv.mts',
    'lib/unified-activity.ts',
  ];
  requiredFiles.forEach((file) => {
    if (!fs.existsSync(path.join(process.cwd(), file))) {
      fail(PREFIX, `Required guardrail file missing: ${file}`, { fix: DEFAULT_FIX });
    }
  });

  const evaluatorPaths = ['app/(dev)/dev/evaluator/page.tsx', 'app/dev/evaluator/page.tsx'];
  const hasEvaluatorPage = evaluatorPaths.some((file) =>
    fs.existsSync(path.join(process.cwd(), file))
  );
  if (!hasEvaluatorPage) {
    fail(PREFIX, `Required guardrail file missing: one of ${evaluatorPaths.join(', ')}`, {
      fix: DEFAULT_FIX,
    });
  }
}

function assertTestsPresent(): void {
  const requiredTests = [
    'tests/engine-invariants.test.js',
    'tests/engine-solver.test.js',
    'tests/engine-objective.test.js',
    'tests/engine-bucket-remaining.test.js',
    'tests/wallet-pass-config.test.js',
    'tests/vine-order.test.js',
    'tests/sessions-bucket-reversal.test.js',
    'tests/simulation-adapter.test.js',
    'tests/category-preference-enum.test.js',
    'tests/api-vine-order.user-context.test.js',
    'tests/api-simulate.user-context.test.js',
    'tests/api-scan.user-context.test.js',
    'tests/api-sessions.user-context.test.js',
    'tests/run-recommendation.user-context.test.js',
    'tests/user-context.test.js',
    'tests/client-api.test.js',
    'tests/bank-ingest.test.js',
    'tests/bank-ingest-idempotent.test.js',
    'tests/income-classifier.test.js',
    'tests/income-regimes.test.js',
    'tests/bucket-regimes.test.js',
    'tests/offline-evaluator-regimes.test.js',
    'tests/offline-evaluator-prisma-guard.test.js',
    'tests/offline-evaluator-basic.test.js',
    'tests/verification-session.test.js',
  ];
  requiredTests.forEach((file) => {
    if (!fs.existsSync(path.join(process.cwd(), file))) {
      fail(PREFIX, `Required guardrail test missing: ${file}`, { fix: DEFAULT_FIX });
    }
  });
}

function main(): void {
  assertEslintRules();
  assertNoNewEslintDisables();
  assertTsconfigStrict();
  assertPackageScripts();
  assertPrismaAssumptions();
  assertCriticalFilesExist();
  assertTestsPresent();
  process.stdout.write('[guardrails] all checks passed\n');
}

main();
