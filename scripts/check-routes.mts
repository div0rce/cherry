import { readdirSync } from 'node:fs';
import * as path from 'node:path';
import { asMessage } from './guardrails/lib/error.mjs';
import { fail } from './guardrails/lib/fail.mjs';

const APP_DIR = path.join(process.cwd(), 'app');
const ALLOWED_GROUPS = new Set(['marketing', 'user', 'dev']);
const ROUTE_KINDS = ['page', 'layout', 'route'];
const ROUTE_EXTENSIONS = new Set(['.tsx', '.jsx', '.ts', '.js']);
const PREFIX = 'check:routes';
const FIX = 'Resolve route nesting conflicts and duplicate route files.';

type RouteEntry = { pages: string[]; layouts: string[]; routes: string[] };
type RouteKey = keyof RouteEntry;

type Violation = { file: string; line: number; col: number; message: string };

const violations: Violation[] = [];
const routeMap = new Map<string, RouteEntry>();
const ROUTE_RECORDS = [
  { key: 'pages', label: 'page' },
  { key: 'layouts', label: 'layout' },
  { key: 'routes', label: 'route' },
] as const satisfies ReadonlyArray<{ key: RouteKey; label: string }>;

function isGroupSegment(segment: string): boolean {
  return segment.startsWith('(') && segment.endsWith(')');
}

function stripGroup(segment: string): string {
  return segment.slice(1, -1);
}

function computeResolvedPath(filePath: string, groupStack: string[]): string {
  const relativePath = path.relative(APP_DIR, filePath);
  const segments = relativePath.split(path.sep);
  segments.pop(); // drop filename

  const normalized = segments
    .filter(Boolean)
    .filter((seg) => !isGroupSegment(seg))
    .filter(Boolean);

  const effectiveSegments =
    normalized.length > 0 ? normalized : [...groupStack].filter(Boolean);

  const joined = `/${effectiveSegments.join('/')}`;
  return joined === '/' || joined === '//' ? '/' : joined.replace(/\/+/g, '/');
}

function recordRoute(filePath: string, kind: string, groupStack: string[]): void {
  const resolvedPath = computeResolvedPath(filePath, groupStack);
  const entry =
    routeMap.get(resolvedPath) ?? { pages: [], layouts: [], routes: [] };
  const key: RouteKey =
    kind === 'page' ? 'pages' : kind === 'layout' ? 'layouts' : 'routes';
  entry[key].push(filePath);
  routeMap.set(resolvedPath, entry);
}

function walk(dir: string, groupStack: string[]): void {
  const entries = readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const nextGroupStack = [...groupStack];
      if (isGroupSegment(entry.name) === true) {
        const groupName = stripGroup(entry.name);
        nextGroupStack.push(groupName);

        if (groupName === 'dev' && groupStack.includes('user')) {
          violations.push({
            file: path.relative(APP_DIR, fullPath),
            line: 1,
            col: 1,
            message: 'Invalid nesting: (dev) under (user)',
          });
        }
        if (groupName === 'user' && groupStack.includes('dev')) {
          violations.push({
            file: path.relative(APP_DIR, fullPath),
            line: 1,
            col: 1,
            message: 'Invalid nesting: (user) under (dev)',
          });
        }
      }

      walk(fullPath, nextGroupStack);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name);
      const base = path.basename(entry.name, ext);
      if (!ROUTE_EXTENSIONS.has(ext) || !ROUTE_KINDS.includes(base)) {
        continue;
      }

      if (groupStack.some((group) => ALLOWED_GROUPS.has(group) === false)) {
        violations.push({
          file: path.relative(APP_DIR, fullPath),
          line: 1,
          col: 1,
          message: 'Route file outside allowed segment groups',
        });
      }

      recordRoute(fullPath, base, groupStack);
    }
  }
}

function checkDuplicates(): void {
  for (const [resolvedPath, entry] of routeMap.entries()) {
    for (const { key, label } of ROUTE_RECORDS) {
      if (entry[key].length > 1) {
        const files = [...entry[key]].sort();
        for (const file of files) {
          violations.push({
            file: path.relative(APP_DIR, file),
            line: 1,
            col: 1,
            message: `Multiple ${label} files resolve to the same path: ${resolvedPath}`,
          });
        }
      }
    }
  }
}

function main(): void {
  walk(APP_DIR, []);
  checkDuplicates();

  if (violations.length > 0) {
    const details = violations.map(
      (violation) =>
        `${path.join('app', violation.file)}:${violation.line}:${violation.col}: ${violation.message}`
    );
    fail(PREFIX, 'Route collision or nesting violations detected', { details, fix: FIX });
  }
}

try {
  main();
} catch (error: unknown) {
  const message = asMessage(error);
  fail(PREFIX, `Guardrail crashed: ${message}`, { fix: FIX });
}
