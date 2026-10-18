import * as fs from 'node:fs';
import * as path from 'node:path';
import fg from 'fast-glob';
import { z } from 'zod';
import { ensureTsEsm } from './lib/ensure-ts-esm.mjs';
import { asMessage } from './guardrails/lib/error.mjs';
import { fail } from './guardrails/lib/fail.mjs';
import { resolveRootArg } from './lib/root-arg.mjs';
import { readJsonFile } from './guardrails/lib/read-json.mjs';

ensureTsEsm();

const ROOT = resolveRootArg(process.argv);
const PREFIX = 'check:domain-boundaries';
const MANIFEST_PATH = path.join('scripts', 'guardrails', 'domains.manifest.json');
const FIX =
  'Assign the file to exactly one domain in scripts/guardrails/domains.manifest.json, or route the import through an allowed domain (see docs/architecture/dependency-rules.md).';

const SCAN_GLOBS = [
  'lib/**/*.{ts,tsx,js,jsx,mjs,cjs}',
  'app/**/*.{ts,tsx,js,jsx,mjs,cjs}',
  'components/**/*.{ts,tsx,js,jsx,mjs,cjs}',
  'types/**/*.{ts,tsx,d.ts}',
  'proxy.ts',
  'instrumentation.ts',
];
const IGNORE_GLOBS = ['**/node_modules/**', '**/.next/**', '**/__mocks__/**', '**/.tmp/**'];
const RESOLVE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];

const DomainSchema = z
  .object({
    layer: z.enum(['core', 'runtime', 'service', 'surface']),
    description: z.string().min(1),
    owns: z.array(z.string().min(1)).min(1),
    mayImport: z.array(z.string().min(1)),
    tests: z.array(z.string().min(1)),
    docs: z.array(z.string().min(1)),
    invariants: z.array(z.string().min(1)).optional(),
  })
  .strict();

const ManifestSchema = z
  .object({
    version: z.literal(1),
    description: z.string(),
    domains: z.record(z.string().min(1), DomainSchema),
    allowedViolations: z.array(
      z.object({ from: z.string().min(1), to: z.string().min(1), reason: z.string().min(1) }).strict()
    ),
  })
  .strict();

type Manifest = z.infer<typeof ManifestSchema>;

type Edge = { from: string; to: string };

function normalize(filePath: string): string {
  return filePath.split(path.sep).join('/');
}

function guardrailFail(message: string, details?: string[]): never {
  fail(PREFIX, message, { details, fix: FIX });
}

function loadManifest(): Manifest {
  const parsed = ManifestSchema.safeParse(readJsonFile(path.join(ROOT, MANIFEST_PATH)));
  if (!parsed.success) {
    guardrailFail(`Invalid ${MANIFEST_PATH}`, parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`));
  }
  return parsed.data;
}

function validateManifestReferences(manifest: Manifest): string[] {
  const problems: string[] = [];
  const ids = new Set(Object.keys(manifest.domains));
  for (const [id, domain] of Object.entries(manifest.domains)) {
    for (const target of domain.mayImport) {
      if (target !== '*' && !ids.has(target)) {
        problems.push(`${id}.mayImport references unknown domain '${target}'`);
      }
    }
    for (const doc of domain.docs) {
      if (!fs.existsSync(path.join(ROOT, doc))) {
        problems.push(`${id}.docs: missing file ${doc}`);
      }
    }
    for (const testGlob of domain.tests) {
      const matches = fg.sync(testGlob, { cwd: ROOT, ignore: IGNORE_GLOBS });
      if (matches.length === 0) {
        problems.push(`${id}.tests: glob matches no files: ${testGlob}`);
      }
    }
  }
  return problems;
}

function buildOwnership(manifest: Manifest, sourceFiles: string[]): { owner: Map<string, string>; problems: string[] } {
  const owner = new Map<string, string>();
  const problems: string[] = [];
  const sourceSet = new Set(sourceFiles);
  for (const [id, domain] of Object.entries(manifest.domains)) {
    const matches = fg.sync(domain.owns, { cwd: ROOT, ignore: IGNORE_GLOBS, onlyFiles: true });
    for (const match of matches) {
      const file = normalize(match);
      if (!sourceSet.has(file)) continue;
      const existing = owner.get(file);
      if (existing !== undefined && existing !== id) {
        problems.push(`${file} is owned by both '${existing}' and '${id}'`);
        continue;
      }
      owner.set(file, id);
    }
  }
  for (const file of sourceFiles) {
    if (!owner.has(file)) {
      problems.push(`${file} is not owned by any domain`);
    }
  }
  return { owner, problems };
}

function stripComments(content: string): string {
  return content.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

// Only `import type` / `export type` are skipped. `import { type Foo } from './x.js'` is NOT erased:
// with verbatimModuleSyntax (tsconfig.base.json) it compiles to `import {} from './x.js'`, which
// still loads the module, so it is a runtime edge.
const IMPORT_FROM_REGEX = /^\s*(import|export)\s+(type\s+)?[^;'"]*?\bfrom\s+['"]([^'"]+)['"]/gm;
const SIDE_EFFECT_IMPORT_REGEX = /^\s*import\s+['"]([^'"]+)['"]/gm;
const DYNAMIC_IMPORT_REGEX = /\b(?:import|require)\(\s*['"]([^'"]+)['"]\s*\)/g;

function valueImportSpecifiers(content: string): string[] {
  const stripped = stripComments(content);
  const specifiers: string[] = [];
  let match: RegExpExecArray | null;
  IMPORT_FROM_REGEX.lastIndex = 0;
  while ((match = IMPORT_FROM_REGEX.exec(stripped)) !== null) {
    const isTypeOnly = match[2] !== undefined;
    const specifier = match[3];
    if (isTypeOnly || specifier === undefined) continue;
    specifiers.push(specifier);
  }
  SIDE_EFFECT_IMPORT_REGEX.lastIndex = 0;
  while ((match = SIDE_EFFECT_IMPORT_REGEX.exec(stripped)) !== null) {
    const specifier = match[1];
    if (specifier !== undefined) specifiers.push(specifier);
  }
  DYNAMIC_IMPORT_REGEX.lastIndex = 0;
  while ((match = DYNAMIC_IMPORT_REGEX.exec(stripped)) !== null) {
    const specifier = match[1];
    if (specifier !== undefined) specifiers.push(specifier);
  }
  return specifiers;
}

function resolveRelative(fromFile: string, specifier: string): string | null {
  const base = path.resolve(ROOT, path.dirname(fromFile), specifier);
  const candidates: string[] = [base];
  const withoutJs = base.replace(/\.(js|mjs|cjs|jsx)$/, '');
  for (const ext of RESOLVE_EXTENSIONS) {
    candidates.push(`${withoutJs}${ext}`);
    candidates.push(path.join(base, `index${ext}`));
  }
  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return normalize(path.relative(ROOT, candidate));
    }
  }
  return null;
}

function collectEdges(sourceFiles: string[]): Edge[] {
  const edges: Edge[] = [];
  for (const file of sourceFiles) {
    const content = fs.readFileSync(path.join(ROOT, file), 'utf8');
    for (const specifier of valueImportSpecifiers(content)) {
      if (!specifier.startsWith('.')) continue;
      const resolved = resolveRelative(file, specifier);
      if (resolved === null) continue;
      edges.push({ from: file, to: resolved });
    }
  }
  return edges;
}

function isAllowedEdge(manifest: Manifest, fromDomain: string, toDomain: string): boolean {
  if (fromDomain === toDomain) return true;
  const domain = manifest.domains[fromDomain];
  if (domain === undefined) return false;
  return domain.mayImport.includes('*') || domain.mayImport.includes(toDomain);
}

function printReport(manifest: Manifest, owner: Map<string, string>, edges: Edge[]): void {
  const counts = new Map<string, number>();
  for (const edge of edges) {
    const fromDomain = owner.get(edge.from);
    const toDomain = owner.get(edge.to);
    if (fromDomain === undefined || toDomain === undefined || fromDomain === toDomain) continue;
    const key = `${fromDomain} -> ${toDomain}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const lines = [...counts.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, count]) => {
      const [fromDomain, toDomain] = key.split(' -> ');
      const allowed = isAllowedEdge(manifest, fromDomain ?? '', toDomain ?? '') ? 'allowed' : 'VIOLATION';
      return `${key}: ${count} (${allowed})`;
    });
  process.stdout.write(`${lines.join('\n')}\n`);
}

function main(): void {
  const manifest = loadManifest();
  const referenceProblems = validateManifestReferences(manifest);
  if (referenceProblems.length > 0) {
    guardrailFail('Domain manifest references are stale', referenceProblems);
  }

  const sourceFiles = fg
    .sync(SCAN_GLOBS, { cwd: ROOT, ignore: IGNORE_GLOBS, onlyFiles: true })
    .map(normalize)
    .sort();
  const { owner, problems: ownershipProblems } = buildOwnership(manifest, sourceFiles);
  if (ownershipProblems.length > 0) {
    guardrailFail('Domain ownership must be total and exclusive', ownershipProblems);
  }

  const edges = collectEdges(sourceFiles);
  if (process.env['CHERRY_DOMAIN_BOUNDARIES_REPORT'] === '1') {
    printReport(manifest, owner, edges);
    return;
  }

  const allowedKeys = new Set(manifest.allowedViolations.map((entry) => `${entry.from} -> ${entry.to}`));
  const seenAllowed = new Set<string>();
  const violations: string[] = [];
  for (const edge of edges) {
    const fromDomain = owner.get(edge.from);
    const toDomain = owner.get(edge.to);
    if (fromDomain === undefined || toDomain === undefined) continue;
    if (isAllowedEdge(manifest, fromDomain, toDomain)) continue;
    const key = `${edge.from} -> ${edge.to}`;
    if (allowedKeys.has(key)) {
      seenAllowed.add(key);
      continue;
    }
    violations.push(`${key}: domain '${fromDomain}' may not import '${toDomain}'`);
  }
  const staleAllowances = [...allowedKeys].filter((key) => !seenAllowed.has(key));
  if (staleAllowances.length > 0) {
    guardrailFail('allowedViolations entries no longer occur; remove them', staleAllowances);
  }
  if (violations.length > 0) {
    guardrailFail('Domain dependency violations detected', violations);
  }
  process.stdout.write(`check-domain-boundaries: ok (${sourceFiles.length} files, ${edges.length} edges, ${Object.keys(manifest.domains).length} domains)\n`);
}

try {
  main();
} catch (error: unknown) {
  if (error instanceof Error && error.name === 'GuardrailFailure') throw error;
  fail(PREFIX, `Guardrail crashed: ${asMessage(error)}`, { fix: FIX });
}
