import * as fs from 'node:fs';
import * as path from 'node:path';
import { z } from 'zod';
import { ensureTsEsm } from './lib/ensure-ts-esm.mjs';
import { fail } from './guardrails/lib/fail.mjs';
import { readJsonFile } from './guardrails/lib/read-json.mjs';
import { resolveTmpRootReadOnly } from './lib/tmp-root.mjs';
import { TMP_BUCKETS } from './lib/tmp/allocate.mjs';

ensureTsEsm();

const ROOT = process.cwd();
const PREFIX = 'check:artifact-size-budgets';
const POLICY_PATH = path.join(ROOT, 'scripts', 'guardrails', 'artifact-budgets.policy.json');
const FIX = 'Reduce artifact sizes or update scripts/guardrails/artifact-budgets.policy.json intentionally.';

const BudgetsSchema = z
  .object({
    'repo.nextDir.maxBytes': z.number().int().nonnegative(),
    'repo.distDir.maxBytes': z.number().int().nonnegative(),
    'repo.coverageDir.maxBytes': z.number().int().nonnegative(),
    'repo.nodeModulesPrisma.maxBytes': z.number().int().nonnegative(),
    'repo.replayBlobs.maxBytes': z.number().int().nonnegative(),
    'repo.replayStaging.maxBytes': z.number().int().nonnegative(),
    'repo.tsbuildinfo.maxBytes': z.number().int().nonnegative(),
    'tmpRoot.maxBytes': z.number().int().nonnegative(),
    'tmpBuckets.npm.maxBytes': z.number().int().nonnegative(),
    'tmpBuckets.next.maxBytes': z.number().int().nonnegative(),
    'tmpBuckets.prisma.maxBytes': z.number().int().nonnegative(),
    'tmpBuckets.guardrails.maxBytes': z.number().int().nonnegative(),
  })
  .strict();

const PolicySchema = z
  .object({
    version: z.literal('artifact_budgets_v1'),
    budgets: BudgetsSchema,
  })
  .strict();

type BudgetResult = {
  key: keyof z.infer<typeof BudgetsSchema>;
  maxBytes: number;
  actualBytes: number;
  offenders: Array<{ path: string; sizeBytes: number }>;
  symlinks: string[];
};

const TMP_BUCKET_BUDGETS = {
  npm: 'tmpBuckets.npm.maxBytes',
  next: 'tmpBuckets.next.maxBytes',
  prisma: 'tmpBuckets.prisma.maxBytes',
  guardrails: 'tmpBuckets.guardrails.maxBytes',
} as const;

function guardrailFail(message: string, details: string[]): never {
  fail(PREFIX, message, { details, fix: FIX });
}

function safeLstat(filePath: string): fs.Stats {
  try {
    return fs.lstatSync(filePath);
  } catch (error: unknown) {
    guardrailFail('Failed to stat path', [path.relative(ROOT, filePath), String(error)]);
  }
}

function safeReaddir(dir: string): fs.Dirent[] {
  try {
    return fs.readdirSync(dir, { withFileTypes: true });
  } catch (error: unknown) {
    guardrailFail('Failed to read directory', [path.relative(ROOT, dir), String(error)]);
  }
}

function sortEntries(entries: fs.Dirent[]): fs.Dirent[] {
  return entries.slice().sort((a, b) => {
    if (a.name < b.name) return -1;
    if (a.name > b.name) return 1;
    return 0;
  });
}

function recordOffender(
  offenders: Array<{ path: string; sizeBytes: number }>,
  entry: { path: string; sizeBytes: number }
): void {
  offenders.push(entry);
  offenders.sort((a, b) => {
    if (a.sizeBytes !== b.sizeBytes) return b.sizeBytes - a.sizeBytes;
    if (a.path < b.path) return -1;
    if (a.path > b.path) return 1;
    return 0;
  });
  if (offenders.length > 10) offenders.length = 10;
}

function collectSizes(pathsToScan: string[]): {
  totalBytes: number;
  offenders: Array<{ path: string; sizeBytes: number }>;
  symlinks: string[];
} {
  let totalBytes = 0;
  const offenders: Array<{ path: string; sizeBytes: number }> = [];
  const symlinks: string[] = [];
  const stack = [...pathsToScan];

  while (stack.length > 0) {
    const current = stack.pop();
    if (current === undefined) continue;
    if (!fs.existsSync(current)) continue;
    const stat = safeLstat(current);
    if (stat.isSymbolicLink()) {
      symlinks.push(path.relative(ROOT, current));
      continue;
    }
    if (stat.isFile()) {
      totalBytes += stat.size;
      recordOffender(offenders, { path: path.relative(ROOT, current), sizeBytes: stat.size });
      continue;
    }
    if (stat.isDirectory()) {
      const entries = sortEntries(safeReaddir(current));
      for (let i = entries.length - 1; i >= 0; i -= 1) {
        const entry = entries[i];
        if (entry === undefined) continue;
        stack.push(path.join(current, entry.name));
      }
      continue;
    }
  }

  symlinks.sort((a, b) => {
    if (a < b) return -1;
    if (a > b) return 1;
    return 0;
  });

  return { totalBytes, offenders, symlinks };
}

function collectTsbuildinfo(root: string): {
  totalBytes: number;
  offenders: Array<{ path: string; sizeBytes: number }>;
  symlinks: string[];
} {
  let totalBytes = 0;
  const offenders: Array<{ path: string; sizeBytes: number }> = [];
  const symlinks: string[] = [];
  const stack = [root];

  while (stack.length > 0) {
    const current = stack.pop();
    if (current === undefined) continue;
    const stat = safeLstat(current);
    if (stat.isSymbolicLink()) {
      symlinks.push(path.relative(ROOT, current));
      continue;
    }
    if (stat.isDirectory()) {
      const base = path.basename(current);
      if (base === '.git') continue;
      const entries = sortEntries(safeReaddir(current));
      for (let i = entries.length - 1; i >= 0; i -= 1) {
        const entry = entries[i];
        if (entry === undefined) continue;
        stack.push(path.join(current, entry.name));
      }
      continue;
    }
    if (stat.isFile() && current.endsWith('.tsbuildinfo')) {
      totalBytes += stat.size;
      recordOffender(offenders, { path: path.relative(ROOT, current), sizeBytes: stat.size });
    }
  }

  symlinks.sort((a, b) => {
    if (a < b) return -1;
    if (a > b) return 1;
    return 0;
  });

  return { totalBytes, offenders, symlinks };
}

function loadPolicy(): z.infer<typeof PolicySchema> {
  if (!fs.existsSync(POLICY_PATH)) {
    guardrailFail('Missing artifact budget policy', [path.relative(ROOT, POLICY_PATH)]);
  }
  const raw = readJsonFile(POLICY_PATH);
  const parsed = PolicySchema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => issue.message);
    guardrailFail('Invalid artifact budget policy', issues);
  }
  return parsed.data;
}

function main(): void {
  const policy = loadPolicy();
  const budgets = policy.budgets;

  const results: BudgetResult[] = [];

  const nextDir = collectSizes([path.join(ROOT, '.next')]);
  results.push({
    key: 'repo.nextDir.maxBytes',
    maxBytes: budgets['repo.nextDir.maxBytes'],
    actualBytes: nextDir.totalBytes,
    offenders: nextDir.offenders,
    symlinks: nextDir.symlinks,
  });

  const distDir = collectSizes([path.join(ROOT, 'dist'), path.join(ROOT, '.vercel', 'output')]);
  results.push({
    key: 'repo.distDir.maxBytes',
    maxBytes: budgets['repo.distDir.maxBytes'],
    actualBytes: distDir.totalBytes,
    offenders: distDir.offenders,
    symlinks: distDir.symlinks,
  });

  const coverageDir = collectSizes([path.join(ROOT, 'coverage')]);
  results.push({
    key: 'repo.coverageDir.maxBytes',
    maxBytes: budgets['repo.coverageDir.maxBytes'],
    actualBytes: coverageDir.totalBytes,
    offenders: coverageDir.offenders,
    symlinks: coverageDir.symlinks,
  });

  const prismaDirs = collectSizes([
    path.join(ROOT, 'node_modules', '.prisma'),
    path.join(ROOT, 'node_modules', '@prisma'),
  ]);
  results.push({
    key: 'repo.nodeModulesPrisma.maxBytes',
    maxBytes: budgets['repo.nodeModulesPrisma.maxBytes'],
    actualBytes: prismaDirs.totalBytes,
    offenders: prismaDirs.offenders,
    symlinks: prismaDirs.symlinks,
  });

  const replayBlobs = collectSizes([path.join(ROOT, 'tests', 'replay', 'blobs')]);
  results.push({
    key: 'repo.replayBlobs.maxBytes',
    maxBytes: budgets['repo.replayBlobs.maxBytes'],
    actualBytes: replayBlobs.totalBytes,
    offenders: replayBlobs.offenders,
    symlinks: replayBlobs.symlinks,
  });

  const replayStaging = collectSizes([path.join(ROOT, 'tests', 'replay', '_staging')]);
  results.push({
    key: 'repo.replayStaging.maxBytes',
    maxBytes: budgets['repo.replayStaging.maxBytes'],
    actualBytes: replayStaging.totalBytes,
    offenders: replayStaging.offenders,
    symlinks: replayStaging.symlinks,
  });

  const tsbuildinfo = collectTsbuildinfo(ROOT);
  results.push({
    key: 'repo.tsbuildinfo.maxBytes',
    maxBytes: budgets['repo.tsbuildinfo.maxBytes'],
    actualBytes: tsbuildinfo.totalBytes,
    offenders: tsbuildinfo.offenders,
    symlinks: tsbuildinfo.symlinks,
  });

  const tmpRoot = resolveTmpRootReadOnly();
  const tmpSizes = collectSizes([tmpRoot]);
  results.push({
    key: 'tmpRoot.maxBytes',
    maxBytes: budgets['tmpRoot.maxBytes'],
    actualBytes: tmpSizes.totalBytes,
    offenders: tmpSizes.offenders,
    symlinks: tmpSizes.symlinks,
  });

  for (const bucket of TMP_BUCKETS) {
    const key = TMP_BUCKET_BUDGETS[bucket];
    const bucketSizes = collectSizes([path.join(tmpRoot, bucket)]);
    results.push({
      key,
      maxBytes: budgets[key],
      actualBytes: bucketSizes.totalBytes,
      offenders: bucketSizes.offenders,
      symlinks: bucketSizes.symlinks,
    });
  }

  const failures: string[] = [];
  for (const result of results) {
    if (result.actualBytes <= result.maxBytes) continue;
    failures.push(
      `budget=${result.key}`,
      `actualBytes=${result.actualBytes}`,
      `limitBytes=${result.maxBytes}`
    );
    for (const offender of result.offenders) {
      failures.push(`offender=${offender.path} bytes=${offender.sizeBytes}`);
    }
    for (const link of result.symlinks) {
      failures.push(`symlink=${link}`);
    }
  }

  if (failures.length > 0) {
    guardrailFail('Artifact size budgets exceeded', failures);
  }

  process.stdout.write('check:artifact-size-budgets: ok\n');
}

main();
