import * as assert from 'node:assert/strict';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DB_GLOBS,
  EXCLUDED,
  GLOBAL_EXCLUDED,
  NEXT_GLOBS,
  NODE_GLOBS,
  ROOT_GLOBS,
  RUNTIME_EXCLUDED,
  TEST_GLOBS,
  resolveFiles,
  resolveUnexpectedRootFiles,
} from '../../../scripts/lib/test-runner-scope.mjs';

const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), '..', '..', '..');

function intersection(left: Set<string>, right: Set<string>): string[] {
  return [...left].filter((file) => right.has(file)).sort();
}

function difference(left: Set<string>, right: Set<string>): string[] {
  return [...left].filter((file) => !right.has(file)).sort();
}

function union(...sets: Set<string>[]): Set<string> {
  const out = new Set<string>();
  for (const set of sets) {
    for (const file of set) {
      out.add(file);
    }
  }
  return out;
}

function assertEmpty(label: string, files: string[]): void {
  assert.deepEqual(files, [], `${label}:\n${files.join('\n')}`);
}

function assertSetEqual(label: string, actual: Set<string>, expected: Set<string>): void {
  const extra = difference(actual, expected);
  const missing = difference(expected, actual);
  assert.deepEqual(
    { extra, missing },
    { extra: [], missing: [] },
    `${label}\nextra:\n${extra.join('\n')}\nmissing:\n${missing.join('\n')}`
  );
}

const root = new Set(await resolveFiles(ROOT_GLOBS, EXCLUDED, repoRoot));
const node = new Set(await resolveFiles(NODE_GLOBS, GLOBAL_EXCLUDED, repoRoot));
const next = new Set(await resolveFiles(NEXT_GLOBS, GLOBAL_EXCLUDED, repoRoot));
const db = new Set(await resolveFiles(DB_GLOBS, GLOBAL_EXCLUDED, repoRoot));
const runtime = new Set(await resolveFiles(TEST_GLOBS, RUNTIME_EXCLUDED, repoRoot));
const owned = new Set(await resolveFiles(TEST_GLOBS, GLOBAL_EXCLUDED, repoRoot));

assertEmpty('root and node lanes overlap', intersection(root, node));
assertEmpty('root and next lanes overlap', intersection(root, next));
assertEmpty('node and next lanes overlap', intersection(node, next));

const seen = new Map<string, number>();
for (const file of [...root, ...node, ...next]) {
  seen.set(file, (seen.get(file) ?? 0) + 1);
}
assertEmpty(
  'runtime test files have duplicate ownership',
  [...seen.entries()]
    .filter(([, count]) => count > 1)
    .map(([file, count]) => `${file} (${count})`)
);

assertSetEqual(
  'runtime tests must equal root + node + next',
  union(root, node, next),
  runtime
);
assertSetEqual(
  'all owned tests must equal root + node + next + db',
  union(root, node, next, db),
  owned
);

assertEmpty('db tests must not be root-owned', intersection(db, root));
assertEmpty('db tests must not be node-owned', intersection(db, node));
assertEmpty('db tests must not be next-owned', intersection(db, next));

assertEmpty(
  'root-owned tests must stay within the explicit legacy root allowlist',
  await resolveUnexpectedRootFiles([...root], repoRoot)
);

process.stdout.write('test-runner-ownership: ok\n');
