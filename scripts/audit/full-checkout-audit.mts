import fs from 'node:fs';
import path from 'node:path';
import { fail } from '../guardrails/lib/fail.mjs';
import { PackageJsonSchema, readJsonFile } from '../guardrails/lib/read-json.mjs';
import { runTool } from '../guardrails/lib/run-tool.mjs';

type FileClassification =
  | 'first_party'
  | 'config'
  | 'generated_local'
  | 'vendor'
  | 'runtime_artifact'
  | 'vcs_internal'
  | 'binary_or_asset'
  | 'unknown';

type ParseStatus =
  | 'parsed'
  | 'text_unparsed'
  | 'binary_unparsed'
  | 'opaque_unparsed'
  | 'classification_metadata_only'
  | 'read_error';

type FileEntry = {
  path: string;
  type: string;
  size: number;
  tracked: boolean;
  classification: FileClassification;
  imports: string[];
  exports: string[];
  parse_status: ParseStatus;
};

type ParsedFile = {
  entry: FileEntry;
  content: string;
  lines: string[];
  imports: ImportRecord[];
  exports: ExportRecord[];
};

type ImportRecord = {
  specifier: string;
  kind: 'import' | 'require' | 'dynamic_import' | 'export_from';
  raw: string;
};

type ExportRecord = {
  name: string;
  kind: string;
};

type GraphNode = {
  path: string;
  classification: FileClassification;
  type: string;
};

type GraphEdge = {
  from: string;
  to: string;
  type:
    | 'import'
    | 'require'
    | 'dynamic_import'
    | 'route_to_lib'
    | 'route_to_db'
    | 'script_to_runtime'
    | 'generated_link';
  via: string;
};

type CommandResult = {
  name: string;
  command: string;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  status: 'passed' | 'failed' | 'blocked';
  exitCode: number | null;
  summary: string;
};

type Finding = {
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  confidence: 'Confirmed' | 'Probable' | 'Possible' | 'Unclear';
  location: string;
  title: string;
  reason: string;
  risk: string;
  fix: string;
};

type RouteInventory = {
  route: string;
  file: string;
  methods: string[];
  auth: string;
  inputs: string[];
  outputs: string[];
  databaseCalls: string[];
  notes: string[];
};

const ROOT = process.cwd();

const OUTPUT_FILES = [
  'workspace_audit.md',
  'repo_index.json',
  'dependency_graph.json',
  'architecture_map.md',
  'code_audit.md',
  'data_model_audit.md',
  'api_inventory.md',
  'infra_audit.md',
  'security_audit.md',
  'test_audit.md',
  'cherry_system_audit.md',
  'simulation_engine_map.md',
  'abandoned_subsystems.md',
  'llm_code_smell_audit.md',
] as const;

const TEXT_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.mts',
  '.cts',
  '.json',
  '.jsonc',
  '.md',
  '.mdx',
  '.txt',
  '.yml',
  '.yaml',
  '.toml',
  '.prisma',
  '.sql',
  '.css',
  '.scss',
  '.html',
  '.xml',
  '.svg',
  '.sh',
  '.zsh',
  '.bash',
  '.env',
  '.lock',
  '.tsbuildinfo',
  '.csv',
  '.log',
  '.patch',
]);

const CODE_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.mts',
  '.cts',
]);

const BINARY_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.ico',
  '.pdf',
  '.woff',
  '.woff2',
  '.ttf',
  '.eot',
  '.zip',
  '.gz',
  '.tgz',
  '.so',
  '.node',
  '.dylib',
  '.a',
  '.wasm',
  '.pyc',
  '.map',
  '.class',
]);

function rel(absPath: string): string {
  const relative = path.relative(ROOT, absPath).split(path.sep).join('/');
  return relative === '' ? '.' : relative;
}

function ensureOutputPlaceholders(): void {
  for (const output of OUTPUT_FILES) {
    const fullPath = path.join(ROOT, output);
    if (!fs.existsSync(fullPath)) {
      fs.writeFileSync(fullPath, '', 'utf8');
    }
  }
}

function runShell(command: string, args: string[]): string {
  const result = runTool(command, args, {
    cwd: ROOT,
    maxBuffer: 16 * 1024 * 1024,
  });
  if (result.exitCode !== 0) {
    const stderr = result.stderr.trim();
    const stdout = result.stdout.trim();
    fail('audit:full-checkout', `${command} failed`, {
      details: [stderr !== '' ? stderr : stdout !== '' ? stdout : `exit=${result.exitCode}`],
      fix: 'Fix the failing audit helper command and rerun npm run audit:full-checkout.',
    });
  }
  return result.stdout;
}

function runOperationalCommand(command: string): CommandResult {
  const started = new Date();
  const result = runTool('bash', ['-lc', command], {
    cwd: ROOT,
    maxBuffer: 64 * 1024 * 1024,
    env: process.env,
  });
  const finished = new Date();
  const combined = `${result.stdout ?? ''}\n${result.stderr ?? ''}`.trim();
  const summary = summarizeCommandOutput(combined);
  let status: CommandResult['status'] = result.exitCode === 0 ? 'passed' : 'failed';

  if (
    result.exitCode !== 0 &&
    /database|postgres|connection|connect|ECONNREFUSED|P1001|P1002|P1010|P1017/i.test(combined)
  ) {
    status = 'blocked';
  }

  return {
    name: command,
    command,
    startedAt: started.toISOString(),
    finishedAt: finished.toISOString(),
    durationMs: finished.getTime() - started.getTime(),
    status,
    exitCode: result.exitCode,
    summary,
  };
}

function summarizeCommandOutput(output: string): string {
  if (output === '') return 'No output captured.';
  const lines = output.split('\n').map((line) => line.trim()).filter((line) => line !== '');
  if (lines.length <= 12) return lines.join('\n');
  const head = lines.slice(0, 6);
  const tail = lines.slice(-6);
  return [...head, '...', ...tail].join('\n');
}

function listTree(): { files: string[]; directoryCount: number } {
  const files: string[] = [];
  let directoryCount = 0;
  const stack = [ROOT];

  while (stack.length > 0) {
    const current = stack.pop();
    if (current === undefined) continue;
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        directoryCount += 1;
        stack.push(fullPath);
      } else if (entry.isFile()) {
        files.push(fullPath);
      }
    }
  }

  files.sort((a, b) => rel(a).localeCompare(rel(b)));
  return { files, directoryCount };
}

function getTrackedFiles(): Set<string> {
  const output = runShell('git', ['ls-files', '-z']);
  return new Set(output.split('\0').filter((item) => item !== ''));
}

function topLevelDir(relativePath: string): string {
  const [first] = relativePath.split('/');
  return first ?? relativePath;
}

function isConfigPath(relativePath: string, basename: string): boolean {
  return (
    basename === 'package.json' ||
    basename === 'package-lock.json' ||
    basename === 'vercel.json' ||
    basename === 'next.config.ts' ||
    basename === 'postcss.config.mjs' ||
    basename === 'eslint.config.mjs' ||
    basename === 'middleware.ts' ||
    basename === '.gitignore' ||
    basename === '.npmrc' ||
    basename === '.env' ||
    basename.startsWith('.env') ||
    basename.startsWith('tsconfig') ||
    relativePath.startsWith('.github/workflows/')
  );
}

function classifyFile(relativePath: string, basename: string): FileClassification {
  if (relativePath.startsWith('.git/')) return 'vcs_internal';
  if (relativePath.startsWith('node_modules/')) return 'vendor';
  if (relativePath.startsWith('.next/') || relativePath.startsWith('.tmp/')) {
    return 'runtime_artifact';
  }
  if (
    relativePath.startsWith('dist-scripts/') ||
    relativePath.startsWith('.vercel/') ||
    relativePath.startsWith('coverage/')
  ) {
    return 'generated_local';
  }
  if (
    relativePath === 'repo_index.json' ||
    relativePath === 'dependency_graph.json' ||
    relativePath.endsWith('_audit.md') ||
    relativePath === 'workspace_audit.md' ||
    relativePath === 'architecture_map.md' ||
    relativePath === 'api_inventory.md' ||
    relativePath === 'simulation_engine_map.md' ||
    relativePath === 'abandoned_subsystems.md'
  ) {
    return 'generated_local';
  }
  if (isConfigPath(relativePath, basename)) return 'config';
  if (
    relativePath.startsWith('app/') ||
    relativePath.startsWith('components/') ||
    relativePath.startsWith('lib/') ||
    relativePath.startsWith('prisma/') ||
    relativePath.startsWith('scripts/') ||
    relativePath.startsWith('tests/') ||
    relativePath.startsWith('types/') ||
    relativePath.startsWith('docs/') ||
    relativePath.startsWith('data/') ||
    relativePath.startsWith('public/') ||
    relativePath === 'AGENTS.md' ||
    relativePath === 'README.md' ||
    relativePath === 'AUDIT.md'
  ) {
    return 'first_party';
  }
  const extension = path.extname(basename).toLowerCase();
  if (BINARY_EXTENSIONS.has(extension)) return 'binary_or_asset';
  return 'unknown';
}

function detectType(relativePath: string, basename: string): string {
  const extension = path.extname(basename).toLowerCase();
  if (basename.startsWith('.env')) return 'env';
  if (basename === 'package-lock.json') return 'lockfile';
  if (basename === 'package.json') return 'package_manifest';
  if (basename === 'schema.prisma' || extension === '.prisma') return 'prisma';
  if (extension === '.ts') return 'typescript';
  if (extension === '.tsx') return 'tsx';
  if (extension === '.js') return 'javascript';
  if (extension === '.jsx') return 'jsx';
  if (extension === '.mjs') return 'javascript_module';
  if (extension === '.cjs') return 'javascript_commonjs';
  if (extension === '.mts') return 'typescript_module';
  if (extension === '.md' || extension === '.mdx') return 'markdown';
  if (extension === '.json' || extension === '.jsonc') return 'json';
  if (extension === '.yml' || extension === '.yaml') return 'yaml';
  if (extension === '.sql') return 'sql';
  if (extension === '.csv') return 'csv';
  if (extension === '.svg') return 'svg';
  if (extension === '.sh' || extension === '.zsh' || extension === '.bash') return 'shell';
  if (extension === '.css' || extension === '.scss') return 'stylesheet';
  if (extension === '.png' || extension === '.jpg' || extension === '.jpeg' || extension === '.gif') {
    return 'image';
  }
  if (relativePath.startsWith('.git/')) return 'git_internal';
  if (relativePath.startsWith('.next/')) return 'next_build_artifact';
  if (relativePath.startsWith('.tmp/')) return 'temp_artifact';
  return extension !== '' ? extension.slice(1) : 'unknown';
}

function shouldReadContent(entry: FileEntry): boolean {
  if (entry.classification === 'vcs_internal') return false;
  if (entry.classification === 'vendor') return false;
  if (entry.classification === 'runtime_artifact') return false;
  if (entry.classification === 'binary_or_asset') return false;
  if (entry.size > 2_000_000) return false;
  if (TEXT_EXTENSIONS.has(path.extname(entry.path).toLowerCase())) return true;
  if (entry.type === 'env' || entry.type === 'json' || entry.type === 'markdown') return true;
  return false;
}

function isBinaryBuffer(buffer: Buffer): boolean {
  const sample = buffer.subarray(0, Math.min(buffer.length, 1024));
  for (const byte of sample) {
    if (byte === 0) return true;
  }
  return false;
}

function parseCodeContent(content: string): { imports: ImportRecord[]; exports: ExportRecord[] } {
  const imports: ImportRecord[] = [];
  const exports: ExportRecord[] = [];
  const seenImports = new Set<string>();
  const seenExports = new Set<string>();

  const importPatterns: Array<[RegExp, ImportRecord['kind']]> = [
    [/import\s+[\s\S]*?\sfrom\s+['"]([^'"]+)['"]/g, 'import'],
    [/import\s+['"]([^'"]+)['"]/g, 'import'],
    [/export\s+[\s\S]*?\sfrom\s+['"]([^'"]+)['"]/g, 'export_from'],
    [/require\(\s*['"]([^'"]+)['"]\s*\)/g, 'require'],
    [/import\(\s*['"]([^'"]+)['"]\s*\)/g, 'dynamic_import'],
  ];

  for (const [pattern, kind] of importPatterns) {
    for (const match of content.matchAll(pattern)) {
      const specifier = match[1];
      const raw = match[0];
      if (specifier === undefined || raw === undefined) continue;
      const key = `${kind}:${specifier}:${raw}`;
      if (seenImports.has(key)) continue;
      seenImports.add(key);
      imports.push({ specifier, kind, raw });
    }
  }

  const exportPatterns: Array<[RegExp, string]> = [
    [/export\s+(?:async\s+)?function\s+([A-Za-z0-9_]+)/g, 'function'],
    [/export\s+const\s+([A-Za-z0-9_]+)/g, 'const'],
    [/export\s+let\s+([A-Za-z0-9_]+)/g, 'let'],
    [/export\s+class\s+([A-Za-z0-9_]+)/g, 'class'],
    [/export\s+interface\s+([A-Za-z0-9_]+)/g, 'interface'],
    [/export\s+type\s+([A-Za-z0-9_]+)/g, 'type'],
    [/export\s+enum\s+([A-Za-z0-9_]+)/g, 'enum'],
  ];

  for (const [pattern, kind] of exportPatterns) {
    for (const match of content.matchAll(pattern)) {
      const name = match[1];
      if (name === undefined) continue;
      const key = `${kind}:${name}`;
      if (seenExports.has(key)) continue;
      seenExports.add(key);
      exports.push({ name, kind });
    }
  }

  for (const match of content.matchAll(/export\s*\{\s*([^}]+)\s*\}/g)) {
    const body = match[1];
    if (body === undefined) continue;
    for (const part of body.split(',')) {
      const normalized = part.trim();
      if (normalized === '') continue;
      const name = normalized.includes(' as ')
        ? normalized.split(/\s+as\s+/)[1]?.trim() ?? normalized
        : normalized;
      const key = `named:${name}`;
      if (seenExports.has(key)) continue;
      seenExports.add(key);
      exports.push({ name, kind: 'named' });
    }
  }

  if (/export\s+default\b/.test(content)) {
    exports.push({ name: 'default', kind: 'default' });
  }

  if (/module\.exports\s*=/.test(content)) {
    exports.push({ name: 'module.exports', kind: 'commonjs' });
  }

  return { imports, exports };
}

function parseFile(entry: FileEntry): ParsedFile | null {
  if (!shouldReadContent(entry)) return null;
  try {
    const fullPath = path.join(ROOT, entry.path);
    const buffer = fs.readFileSync(fullPath);
    if (isBinaryBuffer(buffer)) {
      entry.parse_status = 'binary_unparsed';
      return null;
    }
    const content = buffer.toString('utf8');
    const lines = content.split('\n');
    const ext = path.extname(entry.path).toLowerCase();
    if (CODE_EXTENSIONS.has(ext)) {
      const parsed = parseCodeContent(content);
      entry.imports = parsed.imports.map((item) => item.specifier);
      entry.exports = parsed.exports.map((item) => item.name);
      entry.parse_status = 'parsed';
      return { entry, content, lines, imports: parsed.imports, exports: parsed.exports };
    }
    entry.parse_status = 'text_unparsed';
    return { entry, content, lines, imports: [], exports: [] };
  } catch (_error: unknown) {
    void _error;
    entry.parse_status = 'read_error';
    return null;
  }
}

function resolveLocalImport(fromPath: string, specifier: string): string | null {
  if (specifier.startsWith('@/')) {
    return resolveCandidate(specifier.slice(2));
  }
  if (specifier.startsWith('./') || specifier.startsWith('../')) {
    const baseDir = path.posix.dirname(fromPath);
    return resolveCandidate(path.posix.normalize(path.posix.join(baseDir, specifier)));
  }
  return null;
}

function resolveCandidate(candidate: string): string | null {
  const options = [
    candidate,
    `${candidate}.ts`,
    `${candidate}.tsx`,
    `${candidate}.js`,
    `${candidate}.jsx`,
    `${candidate}.mjs`,
    `${candidate}.cjs`,
    `${candidate}.mts`,
    `${candidate}.cts`,
    `${candidate}.json`,
    path.posix.join(candidate, 'index.ts'),
    path.posix.join(candidate, 'index.tsx'),
    path.posix.join(candidate, 'index.js'),
    path.posix.join(candidate, 'index.mjs'),
  ];
  for (const option of options) {
    if (fs.existsSync(path.join(ROOT, option))) {
      return option;
    }
  }
  return null;
}

function pkgName(specifier: string): string {
  if (specifier.startsWith('@')) {
    const parts = specifier.split('/');
    const [scope, name] = parts;
    return scope != null && name != null ? `${scope}/${name}` : specifier;
  }
  const [name] = specifier.split('/');
  return name ?? specifier;
}

function lineNumber(lines: string[], matcher: string | RegExp): number | null {
  for (const [index, line] of lines.entries()) {
    const matches = typeof matcher === 'string' ? line.includes(matcher) : matcher.test(line);
    if (matches) return index + 1;
  }
  return null;
}

function lineRef(file: string, lines: string[], matcher: string | RegExp): string {
  const line = lineNumber(lines, matcher);
  return line == null ? file : `${file}:${line}`;
}

function topCounts<T extends string>(values: T[]): Array<[T, number]> {
  const counts = new Map<T, number>();
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

function findParsed(parsedFiles: Map<string, ParsedFile>, file: string): ParsedFile {
  const found = parsedFiles.get(file);
  if (found == null) {
    fail('audit:full-checkout', `Expected parsed file: ${file}`, {
      fix: 'Repair full-checkout audit parsing before rerunning npm run audit:full-checkout.',
    });
  }
  return found;
}

function formatList(items: string[]): string {
  if (items.length === 0) return '- None';
  return items.map((item) => `- ${item}`).join('\n');
}

function markdownFindings(findings: Finding[]): string {
  if (findings.length === 0) return '- No findings recorded.\n';
  return findings
    .map(
      (finding) =>
        `- ${finding.severity} | ${finding.confidence} | ${finding.location} | ${finding.title}\n` +
        `  Reason: ${finding.reason}\n` +
        `  Risk: ${finding.risk}\n` +
        `  Recommended fix: ${finding.fix}`
    )
    .join('\n');
}

function buildRoutePath(relativePath: string): string {
  const withoutPrefix = relativePath.replace(/^app\/api/, '').replace(/\/route\.(ts|tsx|js|jsx)$/, '');
  return withoutPrefix === '' ? '/api' : `/api${withoutPrefix}`;
}

function renderTable(rows: string[][]): string {
  const [header, ...body] = rows;
  if (header === undefined) return '';
  const divider = header.map(() => '---');
  return [
    `| ${header.join(' | ')} |`,
    `| ${divider.join(' | ')} |`,
    ...body.map((row) => `| ${row.join(' | ')} |`),
  ].join('\n');
}

function envKeyNames(content: string): string[] {
  return content
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '' && !line.startsWith('#') && line.includes('='))
    .map((line) => line.split('=')[0]?.trim() ?? '')
    .filter((line) => line !== '');
}

function hasRealBankData(relativePath: string): boolean {
  return relativePath.startsWith('data/bank/') && relativePath.endsWith('.csv');
}

function isLocalSecretEnv(pathName: string): boolean {
  return pathName === '.env' || pathName === '.env.local' || pathName === '.env.production.local';
}

function isContextRelevantEntry(entry: FileEntry): boolean {
  if (isLocalSecretEnv(entry.path)) return false;
  if (entry.classification === 'vendor' || entry.classification === 'runtime_artifact' || entry.classification === 'vcs_internal') {
    return false;
  }
  if (entry.classification === 'unknown' || entry.classification === 'binary_or_asset') {
    return false;
  }
  if (hasRealBankData(entry.path)) return false;
  if (entry.classification === 'generated_local') {
    return entry.parse_status !== 'classification_metadata_only' && entry.parse_status !== 'binary_unparsed';
  }
  if (!entry.tracked) return false;
  return entry.parse_status !== 'classification_metadata_only' && entry.parse_status !== 'binary_unparsed';
}

function countUniqueDirectories(entries: FileEntry[]): number {
  const directories = new Set<string>();
  for (const entry of entries) {
    const dir = path.posix.dirname(entry.path);
    if (dir !== '.') directories.add(dir);
  }
  return directories.size;
}

function main(): void {
  ensureOutputPlaceholders();

  const operationalCommands = [
    'npm run check',
    'npm test',
    'npm run build',
    'npm run test:db',
  ];
  const operationalResults = operationalCommands.map((command) => runOperationalCommand(command));

  const trackedFiles = getTrackedFiles();
  const { files, directoryCount } = listTree();

  const entries: FileEntry[] = [];
  const parsedFiles = new Map<string, ParsedFile>();

  for (const absPath of files) {
    const relativePath = rel(absPath);
    const basename = path.basename(absPath);
    const stats = fs.lstatSync(absPath);
    const entry: FileEntry = {
      path: relativePath,
      type: detectType(relativePath, basename),
      size: stats.size,
      tracked: trackedFiles.has(relativePath),
      classification: classifyFile(relativePath, basename),
      imports: [],
      exports: [],
      parse_status: shouldReadContent({
        path: relativePath,
        type: detectType(relativePath, basename),
        size: stats.size,
        tracked: trackedFiles.has(relativePath),
        classification: classifyFile(relativePath, basename),
        imports: [],
        exports: [],
        parse_status: 'opaque_unparsed',
      })
        ? 'opaque_unparsed'
        : 'classification_metadata_only',
    };
    entries.push(entry);
  }

  for (const entry of entries) {
    const parsed = parseFile(entry);
    if (parsed != null) {
      parsedFiles.set(entry.path, parsed);
    }
  }

  const countsByClassification = Object.fromEntries(
    topCounts(entries.map((entry) => entry.classification))
  );

  const graphNodes: GraphNode[] = [];
  const graphEdges: GraphEdge[] = [];
  const unresolvedImports: Array<{ from: string; specifier: string; kind: string }> = [];
  const externalPackageUsage = new Map<string, number>();
  const inbound = new Map<string, number>();
  const importedSymbols = new Map<string, Set<string>>();

  for (const parsed of parsedFiles.values()) {
    graphNodes.push({
      path: parsed.entry.path,
      classification: parsed.entry.classification,
      type: parsed.entry.type,
    });
    inbound.set(parsed.entry.path, inbound.get(parsed.entry.path) ?? 0);
  }

  for (const parsed of parsedFiles.values()) {
    const file = parsed.entry.path;
    const localImports = new Set<string>();
    for (const importRecord of parsed.imports) {
      const resolved = resolveLocalImport(file, importRecord.specifier);
      if (resolved != null) {
        localImports.add(resolved);
        const target = resolved;
        const edgeType: GraphEdge['type'] =
          file.startsWith('app/api/') && target.startsWith('lib/')
            ? 'route_to_lib'
            : file.startsWith('app/api/') &&
                (target === 'lib/prisma.ts' || target === 'lib/prisma.js' || parsed.content.includes('prisma.'))
              ? 'route_to_db'
              : file.startsWith('scripts/') && target.startsWith('lib/')
                ? 'script_to_runtime'
                : importRecord.kind === 'dynamic_import'
                  ? 'dynamic_import'
                  : importRecord.kind === 'require'
                    ? 'require'
                    : 'import';
        graphEdges.push({
          from: file,
          to: target,
          type: edgeType,
          via: importRecord.specifier,
        });
        inbound.set(target, (inbound.get(target) ?? 0) + 1);
      } else {
        if (!importRecord.specifier.startsWith('.') && !importRecord.specifier.startsWith('@/')) {
          const key = pkgName(importRecord.specifier);
          externalPackageUsage.set(key, (externalPackageUsage.get(key) ?? 0) + 1);
        } else {
          unresolvedImports.push({
            from: file,
            specifier: importRecord.specifier,
            kind: importRecord.kind,
          });
        }
      }
    }

    for (const statement of parsed.content.matchAll(/import\s*\{([^}]+)\}\s*from\s*['"]([^'"]+)['"]/g)) {
      const rawNames = statement[1];
      const specifier = statement[2];
      if (rawNames === undefined || specifier === undefined) continue;
      const resolved = resolveLocalImport(file, specifier);
      if (resolved == null) continue;
      const set = importedSymbols.get(resolved) ?? new Set<string>();
      for (const part of rawNames.split(',')) {
        const normalized = part.trim();
        if (normalized === '') continue;
        const importedName = normalized.split(/\s+as\s+/)[0]?.trim() ?? normalized;
        set.add(importedName);
      }
      importedSymbols.set(resolved, set);
    }

    if (parsed.content.includes("import('../../../../lib/wallet/cherryPass.js')")) {
      graphEdges.push({
        from: file,
        to: 'lib/wallet/cherryPass.ts',
        type: 'generated_link',
        via: 'wallet runtime import',
      });
      inbound.set('lib/wallet/cherryPass.ts', (inbound.get('lib/wallet/cherryPass.ts') ?? 0) + 1);
    }

    void localImports;
  }

  const adjacency = new Map<string, string[]>();
  for (const node of graphNodes) adjacency.set(node.path, []);
  for (const edge of graphEdges) {
    const next = adjacency.get(edge.from);
    if (next != null && !next.includes(edge.to)) {
      next.push(edge.to);
    }
  }

  const cycles: string[][] = [];
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const stack: string[] = [];

  function dfs(node: string): void {
    if (visiting.has(node)) {
      const index = stack.indexOf(node);
      cycles.push(stack.slice(index).concat(node));
      return;
    }
    if (visited.has(node)) return;
    visiting.add(node);
    stack.push(node);
    const next = adjacency.get(node) ?? [];
    for (const candidate of next) dfs(candidate);
    stack.pop();
    visiting.delete(node);
    visited.add(node);
  }

  for (const node of graphNodes.map((item) => item.path)) dfs(node);

  const deadModules = graphNodes
    .filter((node) => {
      if (!node.path.startsWith('lib/') && !node.path.startsWith('components/')) return false;
      if (node.path.endsWith('.d.ts')) return false;
      if (node.path.endsWith('/index.ts') || node.path.endsWith('/index.tsx')) return false;
      return (inbound.get(node.path) ?? 0) === 0;
    })
    .map((node) => node.path)
    .sort();

  const unusedExports = [...parsedFiles.values()]
    .filter((parsed) => parsed.entry.path.startsWith('lib/') || parsed.entry.path.startsWith('components/'))
    .flatMap((parsed) => {
      const imported = importedSymbols.get(parsed.entry.path) ?? new Set<string>();
      return parsed.exports
        .filter((exp) => exp.name !== 'default' && exp.name !== 'module.exports')
        .filter((exp) => !imported.has(exp.name))
        .map((exp) => ({ file: parsed.entry.path, export: exp.name }));
    });

  const routeInventory: RouteInventory[] = [...parsedFiles.values()]
    .filter((parsed) => parsed.entry.path.startsWith('app/api/'))
    .map((parsed) => {
      const methods = [...parsed.content.matchAll(/export\s+async\s+function\s+(GET|POST|PUT|PATCH|DELETE)/g)].flatMap(
        (match) => {
          const method = match[1];
          return method === undefined ? [] : [method];
        }
      );
      const auth = parsed.content.includes('withUser(')
        ? 'withUser wrapper'
        : parsed.content.includes('resolveUserContext')
          ? parsed.content.includes('requireAuth: true')
            ? 'resolveUserContext(requireAuth=true)'
            : parsed.content.includes('requireAuth: false')
              ? 'resolveUserContext(requireAuth=false)'
              : 'resolveUserContext'
          : 'No obvious auth wrapper';
      const inputs = [
        ...(parsed.content.includes('parseJsonBody') ? ['JSON body via parseJsonBody'] : []),
        ...(parsed.content.includes('searchParams') ? ['query params'] : []),
        ...(parsed.content.includes('{ params }') ? ['route params'] : []),
      ];
      const outputs = [
        ...(parsed.content.includes('NextResponse.json') ? ['JSON'] : []),
        ...(parsed.content.includes('new NextResponse(') ? ['raw response'] : []),
      ];
      const databaseCalls = [
        ...(parsed.content.includes('prisma.') ? ['direct Prisma access'] : []),
        ...(parsed.content.includes('buildPrismaWorld') ? ['world adapter access'] : []),
      ];
      const notes = [
        ...(parsed.content.includes('allowLabDemo: true') ? ['lab/demo mode allowed'] : []),
        ...(parsed.content.includes('status: 501') ? ['501 scaffold path present'] : []),
      ];
      return {
        route: buildRoutePath(parsed.entry.path),
        file: parsed.entry.path,
        methods,
        auth,
        inputs,
        outputs,
        databaseCalls,
        notes,
      };
    })
    .sort((a, b) => a.route.localeCompare(b.route));

  const schemaContent = findParsed(parsedFiles, 'prisma/schema.prisma').content;
  const prismaModels = [...schemaContent.matchAll(/^model\s+([A-Za-z0-9_]+)/gm)]
    .map((match) => match[1])
    .filter((value): value is string => value !== undefined);
  const prismaEnums = [...schemaContent.matchAll(/^enum\s+([A-Za-z0-9_]+)/gm)]
    .map((match) => match[1])
    .filter((value): value is string => value !== undefined);
  const relationCount = [...schemaContent.matchAll(/@relation\(/g)].length;
  const cascadeCount = [...schemaContent.matchAll(/onDelete:\s*Cascade/g)].length;
  const uniqueCount = [...schemaContent.matchAll(/@unique|@@unique/g)].length;
  const indexCount = [...schemaContent.matchAll(/@@index/g)].length;
  const nullableFieldCount = [...schemaContent.matchAll(/\?\s*(?:@|$)/gm)].length;

  const envFiles = [...parsedFiles.values()].filter((parsed) => parsed.entry.type === 'env');
  const envSummary = envFiles.map((parsed) => ({
    file: parsed.entry.path,
    keys: envKeyNames(parsed.content),
  }));

  const workflowFiles = [...parsedFiles.values()].filter((parsed) =>
    parsed.entry.path.startsWith('.github/workflows/')
  );

  const packageJson = PackageJsonSchema.parse(readJsonFile(path.join(ROOT, 'package.json'))) as {
    scripts?: Record<string, string>;
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    engines?: Record<string, string>;
    packageManager?: string;
  };

  const testFiles = entries.filter((entry) => entry.path.startsWith('tests/') && entry.path !== 'tests/__mocks__/next/server.js');
  const sourceFiles = entries.filter(
    (entry) =>
      (entry.path.startsWith('app/') ||
        entry.path.startsWith('components/') ||
        entry.path.startsWith('lib/') ||
        entry.path.startsWith('scripts/') ||
        entry.path.startsWith('prisma/')) &&
      CODE_EXTENSIONS.has(path.extname(entry.path).toLowerCase())
  );
  const testsByCategory = {
    db: testFiles.filter((entry) => entry.path.startsWith('tests/db/')).length,
    guardrails: testFiles.filter((entry) => entry.path.startsWith('tests/guardrails/')).length,
    engine: testFiles.filter((entry) => entry.path.includes('/engine') || entry.path.includes('engine-')).length,
    api: testFiles.filter((entry) => entry.path.includes('api-') || entry.path.includes('/api')).length,
    next: testFiles.filter((entry) => entry.path.startsWith('tests/next/')).length,
    node: testFiles.filter((entry) => entry.path.startsWith('tests/node/')).length,
  };
  const coveredModuleEstimate = sourceFiles.filter((entry) => {
    const base = path.basename(entry.path, path.extname(entry.path)).toLowerCase();
    return testFiles.some((test) => test.path.toLowerCase().includes(base));
  }).length;
  const coverageEstimate = sourceFiles.length === 0 ? 0 : Math.round((coveredModuleEstimate / sourceFiles.length) * 100);

  const topLevelCounts = Object.fromEntries(
    topCounts(entries.map((entry) => topLevelDir(entry.path))).slice(0, 15)
  );

  const todoMatches = [...parsedFiles.values()]
    .flatMap((parsed) =>
      parsed.lines.flatMap((line, index) =>
        /TODO|FIXME|placeholder|stubbed|no-op|scaffold/i.test(line)
          ? [`${parsed.entry.path}:${index + 1} ${line.trim()}`]
          : []
      )
    )
    .filter((item) => !item.startsWith('docs/'))
    .slice(0, 40);

  const realBankDataFiles = entries.filter((entry) => hasRealBankData(entry.path)).map((entry) => entry.path);

  const codeFindings: Finding[] = [];
  const securityFindings: Finding[] = [];
  const llmSmellFindings: Finding[] = [];
  const abandonedEntries: Array<{
    name: string;
    location: string;
    evidence: string;
    status: string;
    operationalRisk: string;
    recommendedAction: string;
  }> = [];

  const homeBundle = findParsed(parsedFiles, 'lib/home/ui-bundle.ts');
  codeFindings.push({
    severity: 'HIGH',
    confidence: 'Confirmed',
    location: lineRef(homeBundle.entry.path, homeBundle.lines, 'Stub bundle: read-only render until engine wiring is ready.'),
    title: 'Home surface is backed by static demo data rather than live state',
    reason:
      'The user shell bundle is explicitly labeled as a stub and hard-codes labels, dates, balances, and recent activity.',
    risk:
      'This creates a polished UI shell that overstates product completeness and hides the true gap between engine/data readiness and the app surface.',
    fix:
      'Replace the stubbed bundle with real daily-state, bucket, session, and recent-decision queries, or clearly isolate it behind a development/demo gate.',
  });

  const verifySession = findParsed(parsedFiles, 'lib/verification/verify-session.ts');
  codeFindings.push({
    severity: 'HIGH',
    confidence: 'Confirmed',
    location: lineRef(verifySession.entry.path, verifySession.lines, 'autoVerifySession is not wired to external signals yet'),
    title: 'Verification automation is still a no-op',
    reason:
      'The async verification hook returns `null` and logs that it is not wired to external signals.',
    risk:
      'Cherry Points posting can only be trusted for manual or synthetic flows; the intended verify/confirm lifecycle is incomplete.',
    fix:
      'Either wire the function to bank/Vine/receipt signals or remove the automation surface until the end-to-end verification path exists.',
  });

  const legacySimulation = findParsed(parsedFiles, 'lib/simulation.ts');
  codeFindings.push({
    severity: 'HIGH',
    confidence: 'Confirmed',
    location: lineRef(legacySimulation.entry.path, legacySimulation.lines, 'LEGACY SIMULATION ENGINE (ARCHIVED)'),
    title: 'Archived legacy simulation engine remains in-tree beside the canonical engine',
    reason:
      'The file is marked archived, mutates buckets and simulated transactions directly, and coexists with `lib/engine/simulate.ts` and `lib/simulation-adapter.ts`.',
    risk:
      'This preserves a second simulation model with different semantics and invites accidental reuse, drift, or documentation confusion.',
    fix:
      'Move the archived implementation under an explicit legacy directory or delete it once any remaining references are removed.',
  });

  const userMerchants = findParsed(parsedFiles, 'app/api/user/merchants/route.ts');
  codeFindings.push({
    severity: 'MEDIUM',
    confidence: 'Confirmed',
    location: lineRef(userMerchants.entry.path, userMerchants.lines, 'return NextResponse.json({ names: [] });'),
    title: 'Merchant lookup route swallows all backend failures',
    reason:
      'The catch block discards the error and always returns an empty list, making outages indistinguishable from no data.',
    risk:
      'Observability and user trust both degrade because database/auth/runtime regressions silently look like empty merchant history.',
    fix:
      'Log the error and return an explicit failure status or structured degraded-mode response.',
  });

  const scanRoute = findParsed(parsedFiles, 'app/api/scan/route.ts');
  codeFindings.push({
    severity: 'MEDIUM',
    confidence: 'Confirmed',
    location: lineRef(scanRoute.entry.path, scanRoute.lines, 'mapSolverDecisionToLegacyDecision'),
    title: 'Scan API still maps canonical solver output back into a legacy decision shape',
    reason:
      'The main advisory endpoint uses the new solver internally but converts the result through a legacy compatibility mapper before returning it.',
    risk:
      'This keeps the external contract tied to older semantics and obscures whether consumers are ready for canonical engine types.',
    fix:
      'Define a stable public response contract derived directly from solver output, then retire the legacy compatibility layer.',
  });

  if (realBankDataFiles.length > 0) {
    securityFindings.push({
      severity: 'CRITICAL',
      confidence: 'Confirmed',
      location: realBankDataFiles.slice(0, 2).join(', '),
      title: 'Checkout contains real-looking bank statement CSV data',
      reason:
        'The `data/bank/` directory contains personal financial transaction exports with merchant names, timestamps, and other sensitive descriptors.',
      risk:
        'This raises privacy, data-governance, and accidental redistribution risk beyond normal fixture usage.',
      fix:
        'Remove or sanitize the dataset, replace it with synthetic fixtures, and document the allowed data handling policy.',
    });
  }

  const adminRoute = findParsed(parsedFiles, 'app/api/admin/clear-user/route.ts');
  securityFindings.push({
    severity: 'MEDIUM',
    confidence: 'Confirmed',
    location: lineRef(adminRoute.entry.path, adminRoute.lines, 'resolveUserContext'),
    title: 'Destructive admin endpoints are gated by environment and auth, not by an admin role',
    reason:
      'Development-only admin routes require authentication but do not enforce a stronger authorization boundary than “signed-in user”.',
    risk:
      'Any authenticated development user can clear sessions, ledger, or seeded data for the resolved context.',
    fix:
      'Add explicit role or operator checks even for development-only endpoints, or move these capabilities to non-HTTP scripts.',
  });

  const walletRoute = findParsed(parsedFiles, 'app/api/wallet/cherry-pass/route.ts');
  securityFindings.push({
    severity: 'LOW',
    confidence: 'Confirmed',
    location: lineRef(walletRoute.entry.path, walletRoute.lines, 'const cherryPoints = 0; // placeholder until points tracked in DB'),
    title: 'Wallet pass payload still uses placeholder reward state',
    reason:
      'The pass endpoint remains scaffolded behind a 501 gate and falls back to static placeholder values when enabled.',
    risk:
      'If enabled prematurely, the pass would present stale or misleading reward information.',
    fix:
      'Keep the feature gated until points are sourced from durable ledger state and the pass contract is tested end to end.',
  });

  const vineSecurity = findParsed(parsedFiles, 'lib/vine/security.ts');
  securityFindings.push({
    severity: 'MEDIUM',
    confidence: 'Confirmed',
    location: lineRef(vineSecurity.entry.path, vineSecurity.lines, /mode === 'warn'/),
    title: 'Vine signature enforcement can intentionally degrade to warning/off modes',
    reason:
      'Signature verification accepts warn/off modes and logs failures with `console.warn` rather than always rejecting them.',
    risk:
      'Operational misconfiguration can turn an integrity boundary into observability-only behavior.',
    fix:
      'Default production to enforce mode, make weaker modes explicitly non-production, and centralize warning logs through the structured logger.',
  });

  if (envSummary.length > 0) {
    securityFindings.push({
      severity: 'MEDIUM',
      confidence: 'Confirmed',
      location: envSummary.map((item) => item.file).join(', '),
      title: 'Secret-bearing environment files are present in the checkout',
      reason:
        'The repo root contains multiple `.env*` files. This audit redacts values, but the files exist locally and influence operational state.',
      risk:
        'Local secret sprawl complicates reproducibility and increases the chance of accidental disclosure or config drift.',
      fix:
        'Consolidate on `.env.example` as the documented contract and keep live secrets outside the repo-managed workspace when possible.',
    });
  }

  llmSmellFindings.push({
    severity: 'HIGH',
    confidence: 'Confirmed',
    location: `${homeBundle.entry.path}, app/api/wallet/cherry-pass/route.ts, lib/verification/vine.ts`,
    title: 'Several polished surfaces are powered by placeholder or mock-like logic',
    reason:
      'The home bundle is static, wallet pass is scaffolded, and Vine correlation still returns `null` with placeholder implementations nearby.',
    risk:
      'The codebase creates false confidence by presenting mature interfaces over incomplete backend behavior.',
    fix:
      'Collapse or hide placeholder production surfaces until they are attached to live state, or mark them explicitly as demo-only.',
  });

  llmSmellFindings.push({
    severity: 'MEDIUM',
    confidence: 'Probable',
    location: 'lib/simulation-adapter.ts, lib/autopilot/runSimulation.ts',
    title: 'Wrapper sprawl around simulation paths adds names without new semantics',
    reason:
      'Multiple `runSimulation` wrappers simply relay to another engine entrypoint while preserving legacy input/output shapes.',
    risk:
      'This adds indirection that looks like architecture depth without creating a clearer boundary.',
    fix:
      'Collapse wrappers into a single canonical simulation adapter and make legacy compatibility explicit at the edge.',
  });

  const verificationVine = parsedFiles.get('lib/verification/vine.ts');
  if (verificationVine != null && (inbound.get('lib/verification/vine.ts') ?? 0) === 0) {
    abandonedEntries.push({
      name: 'Vine verification correlator',
      location: 'lib/verification/vine.ts',
      evidence: 'No inbound local imports in the dependency graph; the file returns `null` unconditionally.',
      status: 'orphaned',
      operationalRisk: 'It suggests an automated verification path exists when no runtime path consumes it.',
      recommendedAction: 'Delete or integrate it into the verification flow with tests.',
    });
  }

  if ((inbound.get('lib/simulation.ts') ?? 0) === 0) {
    abandonedEntries.push({
      name: 'Archived legacy simulation engine',
      location: 'lib/simulation.ts',
      evidence: 'Marked archived in-file and has zero inbound local imports from runtime modules in the graph.',
      status: 'superseded',
      operationalRisk: 'It preserves obsolete semantics that can be confused with the canonical engine.',
      recommendedAction: 'Archive outside the runtime tree or delete after documenting any historical need.',
    });
  }

  const riskRows = [
    ['Sensitive financial fixture data in checkout', 'CRITICAL', realBankDataFiles[0] ?? 'data/bank', 'Remove or sanitize committed bank data.'],
    ['Home shell backed by static stub bundle', 'HIGH', 'lib/home/ui-bundle.ts', 'Wire to live backend state or gate as demo-only.'],
    ['Auto-verification is not implemented', 'HIGH', 'lib/verification/verify-session.ts', 'Complete signal-based verification or remove the hook.'],
    ['Legacy simulation engine remains in runtime tree', 'HIGH', 'lib/simulation.ts', 'Archive or delete the obsolete engine path.'],
    ['Destructive admin routes lack role checks', 'MEDIUM', 'app/api/admin/*', 'Add explicit operator authorization.'],
    ['Merchant lookup masks backend errors', 'MEDIUM', 'app/api/user/merchants/route.ts', 'Return explicit degraded or error responses.'],
    ['Wallet pass still relies on placeholder rewards', 'LOW', 'app/api/wallet/cherry-pass/route.ts', 'Keep feature gated until DB-backed.'],
  ];

  const commandTable = renderTable([
    ['Command', 'Status', 'Exit', 'Duration ms', 'Started'],
    ...operationalResults.map((result) => [
      result.command,
      result.status,
      String(result.exitCode ?? 'null'),
      String(result.durationMs),
      result.startedAt,
    ]),
  ]);

  const apiTable = renderTable([
    ['Route', 'Methods', 'Auth', 'Inputs', 'DB', 'Notes'],
    ...routeInventory.map((route) => [
      route.route,
      route.methods.length > 0 ? route.methods.join(', ') : 'None',
      route.auth,
      route.inputs.length > 0 ? route.inputs.join(', ') : 'None',
      route.databaseCalls.length > 0 ? route.databaseCalls.join(', ') : 'None',
      route.notes.length > 0 ? route.notes.join(', ') : 'None',
    ]),
  ]);

  const repoMapLines = [
    `- File count: ${entries.length}`,
    `- Directory count: ${directoryCount}`,
    `- Git-tracked files: ${trackedFiles.size}`,
    `- Top-level file distribution: ${Object.entries(topLevelCounts)
      .map(([dir, count]) => `${dir}=${count}`)
      .join(', ')}`,
    `- Classification distribution: ${Object.entries(countsByClassification)
      .map(([key, count]) => `${key}=${count}`)
      .join(', ')}`,
  ].join('\n');

  const architectureMap = `# Architecture Map

## System Overview
- Cherry is implemented as a Next.js App Router application with a Prisma/Postgres persistence layer, a deterministic advisory engine under \`lib/engine/*\`, and extensive guardrail/test infrastructure.
- The repo is not just a UI shell: it contains real recommendation, session, ledger, authority, and DB-semantic logic. It is also not product-complete: several visible surfaces remain scaffolds, stubs, or demo-oriented adapters.
- Literal checkout coverage is dominated by generated/runtime/vendor material: \`.tmp/\`, \`node_modules/\`, \`.next/\`, and \`.git/\` account for the vast majority of files. Those trees matter operationally, but they do not define the product architecture.

## Major Components
- Frontend: route groups under \`app/(dev)\`, \`app/(user)\`, \`app/signin\`, with shared presentation in \`components/\`.
- Backend/API: 39 route handlers under \`app/api/\`, covering scan, sessions, simulations, buckets, cards, autopilot, vine, wallet, activity, daily-state, internal jobs, and admin/dev utilities.
- Engine core: deterministic solver and input boundary under \`lib/engine/*\`, plus authority policy under \`lib/authority/*\`.
- Persistence: Prisma schema with ${prismaModels.length} models, ${prismaEnums.length} enums, ${relationCount} explicit relation annotations, and ${indexCount} explicit secondary indexes.
- Reward/session lifecycle: \`/api/sessions\` plus confirm/verify flows backed by \`RecommendationSession\`, \`CherryPointLedger\`, and bucket rollover/reversal helpers.
- Simulation and autopilot: \`/api/simulate\`, \`/api/simulations\`, \`lib/engine/simulate.ts\`, \`lib/autopilot/*\`, plus a legacy archived engine in \`lib/simulation.ts\`.
- Ingest and context: bank ingest helpers, merchant observations, Vine device/order context, daily-state computations, and offline evaluator artifacts.
- Infra and quality gates: package scripts, guardrail registry, CI workflows, migration tests, DB semantic tests, and execution runners.

## Data Flow
\`\`\`
Observe surface (/api/scan, /api/vine/order, /api/autopilot/*)
  -> request validation (Zod + parseJsonBody)
  -> user-context/auth boundary
  -> authority snapshot + DecisionEvent recording
  -> canonical engine solver
  -> legacy compatibility mapping at selected edges
  -> optional persistence:
       /api/scan -> telemetry only
       /api/sessions -> RecommendationSession + CherryPointLedger + bucket mutation
       /api/sessions/[id]/confirm|verify -> lifecycle transitions
\`\`\`

## Control Flow
- Boundary time is still injected at route level for engine/authority use; the core engine modules stay time-free by contract.
- API routes are relatively thin but not uniformly so: some handlers still contain significant orchestration and response mapping logic.
- Runtime DB access is mostly concentrated behind \`lib/prisma.ts\` and adapter/world helpers, consistent with repo doctrine.
- Tests and guardrails are a first-class subsystem, not an afterthought; they materially shape architecture and allowed changes.

## Module Boundaries
- Intended boundary: \`app/\` for UI/API edges, \`lib/\` for domain logic, \`prisma/\` for schema/migrations, \`scripts/\` for operational tasks.
- Actual boundary adherence is mostly strong in engine/authority code and weaker in older API flows that still map through legacy engine decisions.
- Generated/runtime trees (\`.next\`, \`.tmp\`, \`.vercel\`) and vendor trees (\`node_modules\`) are operational dependencies, not design sources of truth.

## Reverse-Engineered System Design

### Intended Product Model
- Confirmed: Cherry intends to be an advisory spending copilot, not a payment instrument, processor, or terminal.
- Confirmed: The core loop is Observe -> Evaluate -> Recommend -> Reward.
- Confirmed: \`/api/scan\` is advisory/telemetry-only, while sessions and ledger posting happen through explicit session lifecycle endpoints.
- Confirmed: Vine and Wallet are intended as advisory context surfaces only.

### Actual Implemented Model
- Confirmed: A real advisory backend exists today: engine solver, authority policy, Prisma-backed sessions/ledger, bucket runtime, daily-state, bank ingest, and a strong test/guardrail harness are implemented.
- Confirmed: The repo also contains major incomplete surfaces: home UI bundle is static, wallet pass is scaffolded, automated verification is not wired, and some simulation paths still bridge through legacy types.
- Probable: The most operationally real part of the system is the engine/session/ledger/authority core, not the user shell.

### Architectural Mismatches
- Confirmed: Public-facing scan/simulate flows still map canonical solver output back into legacy decision structures.
- Confirmed: Two simulation lineages coexist: canonical solver projection under \`lib/engine/simulate.ts\` and an archived DB-mutating legacy engine in \`lib/simulation.ts\`.
- Confirmed: The home surface advertises a rich product shell while using a stubbed read-only bundle.
- Confirmed: Wallet and automated verification are represented in code and docs but remain incomplete in runtime capability.

### Critical Missing Links
- Confirmed: \`autoVerifySession()\` is a no-op; verification automation is not connected to real signals.
- Confirmed: \`lib/verification/vine.ts\` returns \`null\` and is not part of a live graph path.
- Confirmed: Wallet pass remains 501-gated and uses placeholder reward state.
- Probable: The user-facing shell cannot yet reflect the full authority/daily-state/session model because key aggregation surfaces are still stubbed or partial.

### Probable Evolution Path
- Probable: The codebase is moving toward a versioned deterministic engine + authority policy core, with replay/guardrail discipline and DB semantic tests as hard constraints.
- Probable: Legacy decision compatibility layers will need to be retired before the system can present a simpler public API contract.
- Probable: The next stabilization phase should focus on verification automation, live home/dashboard data, and pruning archived simulation paths before adding new product surfaces.
`;

  const codeAudit = `# Code Audit

## Summary
- Source files reviewed deeply: ${parsedFiles.size}
- Route handlers reviewed: ${routeInventory.length}
- TODO / placeholder markers outside docs (sample): ${todoMatches.length}
- Circular dependency candidates: ${cycles.length}
- Dead module candidates: ${deadModules.length}
- Unused export candidates: ${unusedExports.length}

## Severity Findings
${markdownFindings(codeFindings)}

## Additional Signals
- TODO / placeholder sample:
${formatList(todoMatches.slice(0, 20))}
- Dead module candidates:
${formatList(deadModules.slice(0, 20))}
- Unused export candidates:
${formatList(unusedExports.slice(0, 20).map((item) => `${item.file} -> ${item.export}`))}

## Tier-2 Generated / Vendor / Runtime Notes
- \`.tmp/\` contains ${countsByClassification['runtime_artifact'] ?? 0} runtime artifacts and dominates literal checkout volume.
- \`node_modules/\` is present and intact; it is indexed for coverage but not treated as product architecture.
- \`.git/\` is indexed as VCS internals only.
`;

  const dataModelAudit = `# Data Model Audit

## Schema Inventory
- Models: ${prismaModels.length}
- Enums: ${prismaEnums.length}
- Explicit relations: ${relationCount}
- Cascade relations: ${cascadeCount}
- Unique constraints markers: ${uniqueCount}
- Secondary indexes: ${indexCount}
- Nullable field markers: ${nullableFieldCount}

## Entity Diagram
\`\`\`
User
  -> Card -> RewardRule
  -> Bucket
  -> RecommendationSession -> CherryPointLedger
  -> Simulation -> SimulatedTransaction
  -> DailyState -> AlertEvent
  -> BankTransaction -> MerchantObservation
  -> AccountingTransaction -> AccountingPosting
  -> CategoryPreference
  -> Historical* evaluator tables
\`\`\`

## Normalization Analysis
- Confirmed: Core operational entities are reasonably separated by concern: cards/rules, buckets, recommendation sessions, ledger entries, daily state, authority telemetry, bank ingest, and accounting ledger.
- Confirmed: Several historical/evaluator models expand the schema surface substantially and make the DB more than a minimal app store.
- Confirmed: The repo doctrine explicitly treats \`currentAmount\` as a legacy mirror; keeping both authoritative and derived bucket fields in the schema raises drift risk if runtime boundaries slip.

## Relationships and Constraints
- Confirmed: User is the anchoring parent across most domain models.
- Confirmed: Cascade delete is used heavily (${cascadeCount} occurrences), which simplifies cleanup but increases blast radius for mistaken deletes.
- Confirmed: The migration history is active and non-trivial, with ${fs.readdirSync(path.join(ROOT, 'prisma/migrations')).length - 1} migration directories plus a lockfile.

## Migration Correctness and Risks
- Probable: Migration naming and associated DB semantic tests show deliberate governance, especially around ledger/accounting invariants.
- Confirmed: Two \`bucket_last_reset\` migrations exist in close succession, which signals churn in bucket rollover semantics.
- Confirmed: Accounting and semantic invariant migrations landed late in the sequence, meaning older assumptions may still persist in application code.

## Scaling Risks
- HIGH | Confirmed | Prisma schema and test suite both show a growing cross-product of sessions, ledger, daily-state, evaluator, and accounting features. This is a real system, but schema breadth now creates coordination cost across APIs and docs.
- MEDIUM | Probable | Heavy user-centric fan-out means many user delete and seed flows touch broad transactional surfaces, increasing transaction cost and operational coupling.
- MEDIUM | Confirmed | Nullability remains common (${nullableFieldCount} markers), which is sometimes intentional but still broad enough to require careful normalization at API boundaries.
`;

  const apiInventoryMd = `# API Inventory

## Overview
- Route handlers discovered: ${routeInventory.length}
- Advisory endpoints: /api/scan, /api/simulate, /api/vine/order, /api/autopilot/*
- Persistence endpoints: /api/sessions*, /api/cards*, /api/buckets*, /api/daily-state
- Internal/dev/admin endpoints are present and materially affect operational posture.

## Inventory
${apiTable}

## API Findings
- HIGH | Confirmed | \`/api/scan\` is real and engine-backed, but still returns a legacy-compatible decision contract after canonical solving.
- HIGH | Confirmed | \`/api/sessions\` and confirm/verify flows are the true persistence path for sessions and Cherry Points.
- MEDIUM | Confirmed | \`/api/wallet/cherry-pass\` is intentionally scaffolded and returns 501 when config is incomplete.
- MEDIUM | Confirmed | \`/api/user/merchants\` masks failures with an empty response.
- MEDIUM | Confirmed | Several destructive admin/dev endpoints exist behind environment gates; these are useful operational tools but raise misuse risk in non-production deployments.
`;

  const infraAudit = `# Infrastructure Audit

## Toolchain and Build
- Node engine pin: ${packageJson.engines?.['node'] ?? 'missing'}
- Package manager pin: ${packageJson.packageManager ?? 'missing'}
- Primary scripts: ${Object.keys(packageJson.scripts ?? {}).length}
- Dependencies: ${Object.keys(packageJson.dependencies ?? {}).length}
- Dev dependencies: ${Object.keys(packageJson.devDependencies ?? {}).length}

## Deployment and CI
- Workflows present: ${workflowFiles.map((item) => item.entry.path).join(', ')}
- \`ci.yml\` runs \`npm ci\`, fail-fast guardrails, and final \`npm run ci:verify\`; runtime tests are reached transitively through \`npm test\`.
- \`env-checks.yml\` provisions Postgres, applies Prisma migrations, runs env checks, and executes DB tests.
- No Dockerfile or container deployment manifest was found at the repo root.
- \`vercel.json\` exists, so the deployment story is Vercel-oriented rather than container-first.

## Environment and Secrets
- Environment files present in checkout: ${envSummary.map((item) => item.file).join(', ')}
- Keys observed (names only, values redacted):
${formatList(envSummary.flatMap((item) => item.keys.map((key) => `${item.file} -> ${key}`)).slice(0, 40))}

## Reproducibility Assessment
- Confirmed: Node and npm are pinned, which improves reproducibility.
- Confirmed: CI truth is aligned with package scripts and doctrine.
- Confirmed: Local runtime state is still influenced by live \`.env*\` files and large mutable artifact trees (\`.next/\`, \`.tmp/\`), so the literal checkout is not hermetic.
- Probable: The repo is deployment-aware but not yet deployment-simple; operational correctness depends on env contract, Postgres readiness, and guardrail discipline more than on container images.

## Operational Command Results
${commandTable}

## Command Summaries
${formatList(
  operationalResults.map(
    (result) =>
      `${result.command} -> ${result.status.toUpperCase()} (exit ${String(result.exitCode)})\n${result.summary}`
  )
)}
`;

  const securityAudit = `# Security Audit

## Findings
${markdownFindings(securityFindings)}

## Additional Checks
- Raw SQL usage sample: ${parsedFiles.has('app/api/admin/health/route.ts') ? 'app/api/admin/health/route.ts uses `prisma.$queryRaw` for a simple health probe.' : 'None found.'}
- Unsafe HTML markers: ${
    [...parsedFiles.values()].some((parsed) => parsed.content.includes('dangerouslySetInnerHTML'))
      ? 'Present'
      : 'Not detected in parsed first-party files'
  }
- Eval / Function constructor markers: ${
    [...parsedFiles.values()].some(
      (parsed) => parsed.content.includes('eval(') || parsed.content.includes('new Function(')
    )
      ? 'Present'
      : 'Not detected in parsed first-party files'
  }
- CSRF posture: Possible exposure remains for cookie-authenticated POST routes because there is no obvious centralized CSRF layer in parsed route handlers.
- XSS posture: No obvious \`dangerouslySetInnerHTML\` usage was detected in parsed first-party files, so XSS risk is more about future rendering changes than the current code seen here.
`;

  const testAudit = `# Test Audit

## Coverage Shape
- Total test files: ${testFiles.length}
- Source files considered for rough coverage estimate: ${sourceFiles.length}
- Source files with a same-basename test match: ${coveredModuleEstimate}
- Rough coverage estimate: ${coverageEstimate}%

## Test Distribution
- DB tests: ${testsByCategory.db}
- Guardrail tests: ${testsByCategory.guardrails}
- Engine-focused tests: ${testsByCategory.engine}
- API-focused tests: ${testsByCategory.api}
- Next-runtime tests: ${testsByCategory.next}
- Node-runtime tests: ${testsByCategory.node}

## Tested vs Untested
- Confirmed: Engine, authority, bank ingest, sessions, wallet config, Vine security, DB constraints, and migration safety all have real tests.
- Confirmed: Guardrails are a major test surface, not just lint-adjacent checks.
- Probable: UI shell aggregation surfaces such as the home bundle are under-tested relative to their user-facing importance.
- Probable: Coverage breadth is real but uneven; compatibility wrappers and stubs often have tests, while fully integrated user journeys remain partial.
`;

  const cherrySystemAudit = `# Cherry System Audit

## Overall Verdict
- Confirmed: Cherry is not just a UI shell. It has a real advisory engine, real authority policy, real session/ledger persistence, real Prisma schema/migrations, and meaningful automated test/guardrail coverage.
- Confirmed: Cherry is also not product-complete. The current system is best described as a partial prototype with a real backend core and incomplete user/product surfaces.

## Completeness
- Payment simulation engine: Partially complete. Canonical projection logic exists in \`lib/engine/simulate.ts\`, but legacy simulation code remains alongside it.
- Budget modeling: Largely real. Bucket runtime, period rollover, strict-mode logic, category preferences, and daily-state/authority policies are implemented.
- Scenario computation: Real but fragmented. Autopilot, simulate, scan, and Vine all evaluate scenarios, but several surfaces still bridge through legacy mappings.
- Transaction graph / ledger: Real. Session, CherryPointLedger, accounting ledger, and DB semantic tests show durable backend intent.
- Forecasting logic: Partial. Daily-state and income regime components exist, but the home/dashboard surfacing of that logic is still stubbed.

## Correctness
- Confirmed: The repo has unusually strong doctrine/guardrail emphasis around determinism, versioning, DB truth, and test isolation.
- Probable: The backend core is more trustworthy than the user shell because the shell still includes placeholder or static data paths.
- Confirmed: Verification automation is the largest missing correctness link in the reward lifecycle.

## Scalability
- Probable: The deterministic engine/authority split can scale conceptually.
- Confirmed: Schema and feature-surface sprawl already create integration overhead.
- Probable: Legacy compatibility layers will become the main drag on maintainability if left in place.
`;

  const simulationEngineMap = `# Simulation Engine Map

## 1 Entry Points
- \`app/api/simulate/route.ts\`
- \`app/api/scan/route.ts\`
- \`app/api/vine/order/route.ts\`
- \`app/api/autopilot/preview/route.ts\`
- \`lib/autopilot/runSimulation.ts\`
- \`lib/simulation-adapter.ts\`

## 2 Core Simulation Modules
- Canonical projection: \`lib/engine/simulate.ts\`
- Canonical solve/run path: \`lib/engine/run.ts\`, \`lib/engine/solver.ts\`, \`lib/engine/input/*\`
- Authority layer: \`lib/authority/simulateSpendAuthority.ts\` and Prisma snapshot adapter
- Legacy archived engine: \`lib/simulation.ts\`

## 3 State Representation
- Engine state: cards, buckets, debts, cash, preferences, versioned engine input
- Authority snapshot: daily state, bucket runtime, category preference mode, pending sessions, pending points
- Persistence state: recommendation sessions, ledger entries, simulated transactions, daily state, bank transactions

## 4 Event / Transaction Lifecycle
\`\`\`
Request
  -> auth/user context
  -> validation
  -> authority snapshot + decision event telemetry
  -> canonical engine solve
  -> legacy response mapping on selected surfaces
  -> optional persistence:
       simulate -> SimulatedTransaction history
       sessions -> RecommendationSession + CherryPointLedger
       verify -> POSTED / REVOKED / bucket reversal
\`\`\`

## 5 Forecasting Logic
- Daily-state and income regime code exists and feeds authority context.
- Forecasting is not yet presented through a fully live user shell.
- Home surface still uses static sample metrics, so forecast depth in the UI is weaker than forecast depth in the backend model.

## 6 Scenario Computation Flow
\`\`\`
User Input
   ↓
Validation / Category Resolution
   ↓
Authority Snapshot + DecisionEvent
   ↓
Engine Context + Engine State
   ↓
Canonical Solver
   ↓
Projection (\`lib/engine/simulate.ts\`) or Legacy Mapping
   ↓
Persisted Result / API Response / UI Output
\`\`\`

## 7 Budget Update Rules
- Canonical simulation projection is side-effect free.
- Session confirm/verify flows are stateful and can mutate bucket spend and ledger status.
- Legacy archived simulation mutates bucket spend directly and is therefore semantically different from canonical projection.

## 8 Missing or Broken Simulation Links
- Confirmed: Archived legacy simulation remains in-tree and can mislead implementers.
- Confirmed: Several entrypoints still map solver output into legacy decision types.
- Confirmed: Verification automation is not wired, so simulation outcomes do not naturally mature into fully trusted posted results.

## 9 Scalability Risks
- Multiple simulation adapters/wrappers increase cognitive load.
- Legacy compatibility shapes slow down API simplification.
- Daily-state, authority, and simulation are conceptually aligned, but the UI shell does not yet expose that coherence.

## 10 Recommended Refactor Plan
- Delete or archive \`lib/simulation.ts\` outside runtime paths.
- Promote one canonical simulation contract derived from solver output.
- Attach session verification to real signals before adding new reward surfaces.
- Replace stubbed home/dashboard simulation summaries with live daily-state and recent-decision data.
`;

  const abandonedMd = `# Abandoned / Dead Subsystems

${abandonedEntries.length === 0
    ? '- No high-confidence abandoned subsystems were detected.'
    : abandonedEntries
        .map(
          (entry) =>
            `## ${entry.name}\n` +
            `- Location: ${entry.location}\n` +
            `- Evidence: ${entry.evidence}\n` +
            `- Status: ${entry.status}\n` +
            `- Operational Risk: ${entry.operationalRisk}\n` +
            `- Recommended Action: ${entry.recommendedAction}`
        )
        .join('\n\n')}
`;

  const llmSmellMd = `# LLM Code Smell Audit

## 1 High-Confidence Code Smells
${markdownFindings(llmSmellFindings)}

## 2 Medium-Confidence Pattern Artifacts
- MEDIUM | Probable | API compatibility wrappers around the engine preserve legacy response shapes longer than the solver architecture suggests.
- MEDIUM | Possible | Repeated “thin wrapper” simulation helpers create interface breadth without clear semantic separation.

## 3 Copy-Paste Clusters
- Admin clear routes share near-identical scaffolding with small differences.
- Runtime tests are partitioned across root legacy, node, and next lanes; ownership is enforced by the test-runner ownership guardrail.

## 4 Semantic Disconnects
- Home shell copy promises live month-state depth while \`getHomeUiBundle()\` is stubbed.
- Wallet pass surface exists in docs and routing but remains scaffolded behind config gating.

## 5 Dangerous False-Confidence Code
- Placeholder reward values in wallet pass.
- Null-returning Vine verification correlator.
- Archived legacy simulation engine preserved beside canonical engine code.

## 6 Cleanup Priorities
- Remove archived/superseded simulation code.
- Collapse wrapper-only simulation adapters.
- Hide or clearly label stubbed user-shell surfaces until backed by live state.
`;

  const workspaceAudit = `# Workspace Audit

## 1 Executive Summary
- Cherry is currently a partial prototype with a real advisory backend core. It is not just a UI shell, but it is also not a fully integrated product.
- The most operationally real subsystem is the deterministic advisory core: engine, authority policy, session/ledger lifecycle, bucket runtime, Prisma schema, DB semantics, and guardrails.
- The most misleadingly complete subsystem is the user shell: the home bundle is static, wallet pass is scaffolded, and verification automation is unfinished.
- Literal checkout coverage is dominated by generated/runtime/vendor material, but the product truth lives in the tracked app/lib/prisma/scripts/tests tree.

## 2 Repository Map
${repoMapLines}

## 3 Architecture Overview
- Intended system: advisory spending copilot with Observe -> Evaluate -> Recommend -> Reward, never touching payment rails.
- Actual implemented system: Next.js + Prisma app with a real engine/authority/session core, plus several stubbed or scaffolded user/product surfaces.
- Foundational modules: \`lib/engine/*\`, \`lib/authority/*\`, \`lib/sessions/*\`, \`lib/buckets-runtime.ts\`, \`lib/adapters/runtime/*\`, \`prisma/schema.prisma\`.
- Cosmetic or unfinished modules: \`lib/home/ui-bundle.ts\`, wallet pass scaffold, automated verification hooks, archived legacy simulation engine.

## 4 Dependency Graph Analysis
- Parseable graph nodes: ${graphNodes.length}
- Graph edges: ${graphEdges.length}
- Circular dependency candidates: ${cycles.length}
- Dead module candidates: ${deadModules.length}
- Unused export candidates: ${unusedExports.length}
- External package usage leaders: ${[...externalPackageUsage.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => `${name}=${count}`)
    .join(', ')}

## 5 Code Quality Findings
${markdownFindings(codeFindings)}

## 6 Data Model Review
- Prisma models: ${prismaModels.length}
- Prisma enums: ${prismaEnums.length}
- Relation annotations: ${relationCount}
- Key conclusion: the data model is real and fairly rich, but breadth and nullable surface area create integration complexity.

## 7 API Surface Review
- Route count: ${routeInventory.length}
- Key truth: \`/api/scan\` is advisory-only and logs telemetry; sessions + ledger persistence live under \`/api/sessions\`.
- Risk: API contracts still expose legacy compatibility shapes in places where the canonical solver already exists.

## 8 Infrastructure Assessment
- Toolchain pinning exists and CI is script-aligned.
- DB truth is stronger than many app repos because CI includes Postgres migration + DB test coverage.
- No Docker/container deployment story was found; Vercel-style deployment appears primary.

## 9 Security Findings
${markdownFindings(securityFindings)}

## 10 Test Coverage
- Rough coverage estimate: ${coverageEstimate}%
- Strongest areas: guardrails, DB semantics, engine, authority, API compatibility tests.
- Weakest areas: live user-shell aggregation and end-to-end verification/product flows.

## 11 Cherry System Evaluation
- Answer 1: Cherry is a partial prototype with a real backend core, not a mere UI shell.
- Answer 2: The simulation engine actually lives in the canonical solver/projection path under \`lib/engine/*\`, with adapters in \`lib/simulation-adapter.ts\` and \`lib/autopilot/runSimulation.ts\`; \`lib/simulation.ts\` is archived legacy code.
- Answer 3: Budgeting logic is mostly coherent in the backend core (bucket runtime, strict mode, daily state, authority), but fragmented at product boundaries because multiple surfaces still bridge through older shapes.
- Answer 4: The home UI bundle, wallet pass scaffold, and null/no-op verification helpers create the strongest illusion of progress without equivalent functional depth.
- Answer 5: Immediate delete/archive candidates are \`lib/simulation.ts\` and \`lib/verification/vine.ts\` unless a live consumer is restored.
- Answer 6: If development resumes, stabilize verification automation, retire legacy simulation/response shims, and replace static shell bundles with live data.
- Answer 7: The implied architectural direction is a rigorously versioned, deterministic decisioning core with replay/guardrail governance and thinner public API adapters.

## 11A Reverse-Engineered System Design
- Intended product model: advisory copilot, not payment rail.
- Actual implemented model: real engine + persistence core with incomplete shell/product edges.
- Divergence: user-facing polish exceeds live backend integration in several places.
- Foundational modules: engine, authority, sessions/ledger, bucket runtime, Prisma schema, DB tests.
- Cosmetic/unfinished modules: home bundle, wallet pass, auto-verification, orphaned Vine verification correlator.

## 11B Simulation Engine Analysis
- Canonical engine path is real and deterministic.
- Legacy archived simulation engine is still present and should be removed or quarantined.
- Simulation logic is split across scan, simulate, autopilot, and Vine flows; the system would benefit from one canonical public simulation contract.

## 11C Abandoned Subsystems
${
  abandonedEntries.length === 0
    ? '- No high-confidence abandoned subsystem was found.'
    : abandonedEntries.map((entry) => `- ${entry.name}: ${entry.location} (${entry.status})`).join('\n')
}

## 11D LLM Code Smell Audit
${markdownFindings(llmSmellFindings)}

## 12 Risk Assessment
${renderTable([['Risk', 'Severity', 'Location', 'Fix'], ...riskRows])}

## 13 Immediate Fixes
- Remove or sanitize sensitive bank CSV data.
- Wire the home bundle to real state or explicitly gate it as demo-only.
- Implement or delete the automated verification path.
- Archive or delete the legacy simulation engine.
- Add explicit operator authorization to admin endpoints.

## 14 Strategic Refactors
- Promote one canonical simulation/decision response model and retire legacy mapping at API edges.
- Reduce wrapper sprawl around engine simulation entrypoints.
- Continue the existing doctrine-first direction: keep determinism, versioning, DB-truth tests, and guardrails central as the shell catches up to the core.
`;

  const contextEntries = entries.filter((entry) => isContextRelevantEntry(entry));
  const omittedEntries = entries.filter((entry) => !isContextRelevantEntry(entry));
  const contextCountsByClassification = Object.fromEntries(
    topCounts(contextEntries.map((entry) => entry.classification))
  );
  const contextCountsByType = Object.fromEntries(topCounts(contextEntries.map((entry) => entry.type)));
  const omittedByClassification = Object.fromEntries(
    topCounts(omittedEntries.map((entry) => entry.classification))
  );

  const repoIndexObject = {
    files: contextEntries,
    file_count: contextEntries.length,
    directory_count: countUniqueDirectories(contextEntries),
    counts_by_classification: contextCountsByClassification,
    counts_by_type: contextCountsByType,
    full_file_count: entries.length,
    full_directory_count: directoryCount,
    omitted_file_count: omittedEntries.length,
    omitted_by_classification: omittedByClassification,
    selection_rule:
      'Context-focused index: tracked repo-owned parseable files plus generated audit artifacts; excludes vendor/runtime/VCS trees, local secret env files, binary noise, and sensitive bank CSVs.',
  };

  const dependencyGraphObject = {
    nodes: graphNodes,
    edges: graphEdges,
    cycles,
    dead_modules: deadModules,
    unused_exports: unusedExports,
    unresolved_imports: unresolvedImports,
    summary: {
      node_count: graphNodes.length,
      edge_count: graphEdges.length,
      external_package_usage: [...externalPackageUsage.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([name, count]) => ({ name, count })),
      parseable_file_count: parsedFiles.size,
    },
  };

  fs.writeFileSync(path.join(ROOT, 'architecture_map.md'), architectureMap, 'utf8');
  fs.writeFileSync(path.join(ROOT, 'code_audit.md'), codeAudit, 'utf8');
  fs.writeFileSync(path.join(ROOT, 'data_model_audit.md'), dataModelAudit, 'utf8');
  fs.writeFileSync(path.join(ROOT, 'api_inventory.md'), apiInventoryMd, 'utf8');
  fs.writeFileSync(path.join(ROOT, 'infra_audit.md'), infraAudit, 'utf8');
  fs.writeFileSync(path.join(ROOT, 'security_audit.md'), securityAudit, 'utf8');
  fs.writeFileSync(path.join(ROOT, 'test_audit.md'), testAudit, 'utf8');
  fs.writeFileSync(path.join(ROOT, 'cherry_system_audit.md'), cherrySystemAudit, 'utf8');
  fs.writeFileSync(path.join(ROOT, 'simulation_engine_map.md'), simulationEngineMap, 'utf8');
  fs.writeFileSync(path.join(ROOT, 'abandoned_subsystems.md'), abandonedMd, 'utf8');
  fs.writeFileSync(path.join(ROOT, 'llm_code_smell_audit.md'), llmSmellMd, 'utf8');
  fs.writeFileSync(path.join(ROOT, 'workspace_audit.md'), workspaceAudit, 'utf8');
  fs.writeFileSync(path.join(ROOT, 'dependency_graph.json'), JSON.stringify(dependencyGraphObject, null, 2), 'utf8');

  const repoIndexPath = path.join(ROOT, 'repo_index.json');
  let stabilized = false;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    fs.writeFileSync(repoIndexPath, JSON.stringify(repoIndexObject, null, 2), 'utf8');
    const size = fs.statSync(repoIndexPath).size;
    const selfEntry = repoIndexObject.files.find((file) => file.path === 'repo_index.json');
    if (selfEntry == null) break;
    if (selfEntry.size === size) {
      stabilized = true;
      break;
    }
    selfEntry.size = size;
  }
  if (!stabilized) {
    fs.writeFileSync(repoIndexPath, JSON.stringify(repoIndexObject, null, 2), 'utf8');
  }
}

main();
