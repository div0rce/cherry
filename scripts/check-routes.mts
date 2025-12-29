import { readdirSync } from 'node:fs';
import path from 'node:path';

const APP_DIR = path.join(process.cwd(), 'app');
const ALLOWED_GROUPS = new Set(['marketing', 'user', 'dev']);
const ROUTE_KINDS = ['page', 'layout', 'route'];
const ROUTE_EXTENSIONS = new Set(['.tsx', '.jsx', '.ts', '.js']);

const errors: string[] = [];
const routeMap = new Map<
  string,
  { pages: string[]; layouts: string[]; routes: string[] }
>();

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
  const key =
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
          errors.push(`Invalid nesting: (dev) under (user) at ${fullPath}`);
        }
        if (groupName === 'user' && groupStack.includes('dev')) {
          errors.push(`Invalid nesting: (user) under (dev) at ${fullPath}`);
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
        errors.push(`Route file outside allowed segment groups: ${fullPath}`);
      }

      recordRoute(fullPath, base, groupStack);
    }
  }
}

function checkDuplicates(): void {
  for (const [resolvedPath, entry] of routeMap.entries()) {
    [
      { key: 'pages', label: 'page' },
      { key: 'layouts', label: 'layout' },
      { key: 'routes', label: 'route' },
    ].forEach(({ key, label }) => {
      if (entry[key].length > 1) {
        const files = [...entry[key]].sort();
        errors.push(
          `Multiple ${label} files resolve to the same path: ${resolvedPath} -> ${files.join(', ')}`,
        );
      }
    });
  }
}

function main(): void {
  walk(APP_DIR, []);
  checkDuplicates();

  if (errors.length > 0) {
    errors.sort().forEach((message) => {
      console.error(message);
    });
    process.exitCode = 1;
  }
}

main();
