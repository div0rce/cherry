import * as path from 'node:path';
import { z } from 'zod';
import { ensureTsEsm } from './lib/ensure-ts-esm.mjs';
import { fail } from './guardrails/lib/fail.mjs';
import { readJsonFile } from './guardrails/lib/read-json.mjs';
import { runTool } from './guardrails/lib/run-tool.mjs';

ensureTsEsm();

// Usage:
//   npm run report:domain-impact -- <path> [<path> ...]   # domains + tests + docs for these files
//   npm run report:domain-impact                          # same, for files changed vs origin/main (or main)
// Read-only. Prints the DOMAIN-level verification an agent should run before the FULL gate.

const ROOT = process.cwd();
const PREFIX = 'report:domain-impact';
const MANIFEST_PATH = path.join(ROOT, 'scripts', 'guardrails', 'domains.manifest.json');
const FIX = 'Pass repo-relative paths, or run inside a git checkout with a main branch.';

const ManifestSchema = z
  .object({
    domains: z.record(
      z.string(),
      z
        .object({
          layer: z.string(),
          description: z.string(),
          owns: z.array(z.string()),
          mayImport: z.array(z.string()),
          tests: z.array(z.string()),
          docs: z.array(z.string()),
          invariants: z.array(z.string()).optional(),
        })
        .passthrough()
    ),
  })
  .passthrough();

function normalize(filePath: string): string {
  return filePath.split(path.sep).join('/');
}

function changedFiles(): string[] {
  for (const base of ['origin/main', 'main']) {
    const result = runTool('git', ['diff', '--name-only', `${base}...HEAD`]);
    if (result.exitCode !== 0) continue;
    const staged = runTool('git', ['diff', '--name-only', 'HEAD']);
    const untracked = runTool('git', ['ls-files', '--others', '--exclude-standard']);
    const all = `${result.stdout}\n${staged.stdout}\n${untracked.stdout}`;
    return [...new Set(all.split('\n').map((line) => line.trim()).filter((line) => line.length > 0))];
  }
  fail(PREFIX, 'Unable to diff against origin/main or main', { fix: FIX });
}

function main(): void {
  const manifest = ManifestSchema.safeParse(readJsonFile(MANIFEST_PATH));
  if (!manifest.success) {
    fail(PREFIX, 'Invalid domains manifest', { details: [manifest.error.message], fix: FIX });
  }
  const argFiles = process.argv.slice(2).map((arg) => normalize(path.relative(ROOT, path.resolve(ROOT, arg))));
  const files = argFiles.length > 0 ? argFiles : changedFiles();

  // Match paths against the manifest patterns rather than globbing the disk, so deleted files keep
  // their owner. Manifest patterns escape parens for fast-glob (`app/\(dev\)/**`); matchesGlob
  // wants them bare.
  const domains = Object.entries(manifest.data.domains).map(([id, domain]) => ({
    id,
    owns: domain.owns.map((pattern) => pattern.replace(/\\([()])/g, '$1')),
  }));
  const ownerOf = (file: string): string | undefined =>
    domains.find((domain) => domain.owns.some((pattern) => path.matchesGlob(file, pattern)))?.id;

  const touched = new Map<string, string[]>();
  const unowned: string[] = [];
  for (const file of files) {
    const owner = ownerOf(file);
    if (owner === undefined) {
      unowned.push(file);
      continue;
    }
    touched.set(owner, [...(touched.get(owner) ?? []), file]);
  }

  const lines: string[] = [];
  lines.push(`Files considered: ${files.length}`);
  for (const [id, ownedFiles] of [...touched.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const domain = manifest.data.domains[id];
    if (domain === undefined) continue;
    lines.push('');
    lines.push(`DOMAIN ${id} (${domain.layer}): ${domain.description}`);
    lines.push(`  files: ${ownedFiles.join(', ')}`);
    lines.push(`  may import: ${domain.mayImport.length > 0 ? domain.mayImport.join(', ') : '(nothing)'}`);
    const dependents = Object.entries(manifest.data.domains)
      .filter(([other, def]) => other !== id && (def.mayImport.includes(id) || def.mayImport.includes('*')))
      .map(([other]) => other);
    lines.push(`  imported by: ${dependents.length > 0 ? dependents.join(', ') : '(nothing)'}`);
    lines.push(`  tests: ${domain.tests.length > 0 ? domain.tests.join(' ') : '(none registered)'}`);
    lines.push(`  docs: ${domain.docs.length > 0 ? domain.docs.join(' ') : '(none)'}`);
    for (const invariant of domain.invariants ?? []) {
      lines.push(`  invariant: ${invariant}`);
    }
  }
  if (unowned.length > 0) {
    lines.push('');
    lines.push(`Outside lib/app/components (not domain-mapped): ${unowned.join(', ')}`);
  }
  const testGlobs = [...touched.keys()].flatMap((id) => manifest.data.domains[id]?.tests ?? []);
  lines.push('');
  lines.push('DOMAIN verification (not a substitute for the FULL gate):');
  const nodeGlobs = testGlobs.filter((glob) => glob.startsWith('tests/node'));
  const nextGlobs = testGlobs.filter((glob) => glob.startsWith('tests/next'));
  if (nodeGlobs.length > 0) {
    lines.push(`  npm run check:tests:node -- --filter=${nodeGlobs.join(',')}`);
  }
  if (nextGlobs.length > 0) {
    lines.push(`  npm run check:tests:next -- --filter=${nextGlobs.join(',')}`);
  }
  if (touched.has('engine') || touched.has('authority') || touched.has('accounting')) {
    lines.push('  npm run check:guardrails   # engine-sensitive: version gates, freeze, accounting proofs');
  }
  lines.push('FULL gate: npm run check && npm test && npm run build');
  process.stdout.write(`${lines.join('\n')}\n`);
}

main();
