import { readdirSync } from 'node:fs';
import path from 'node:path';

const APP_DIR = path.join(process.cwd(), 'app');
const ALLOWED_GROUPS = new Set(['marketing', 'user', 'dev']);
const ROUTE_KINDS = ['page', 'layout', 'route'];
const ROUTE_EXTENSIONS = new Set(['.tsx', '.jsx', '.ts', '.js']);

const errors = [];
const routeMap = new Map();

function isGroupSegment(segment) {
  return segment.startsWith('(') && segment.endsWith(')');
}

function stripGroup(segment) {
  return segment.slice(1, -1);
}

function computeResolvedPath(filePath) {
  const relativePath = path.relative(APP_DIR, filePath);
  const segments = relativePath.split(path.sep);
  segments.pop(); // drop filename

  const normalized = segments
    .filter(Boolean)
    .map((seg) => (isGroupSegment(seg) ? stripGroup(seg) : seg))
    .filter(Boolean);

  const joined = `/${normalized.join('/')}`;
  return joined === '/' || joined === '//' ? '/' : joined.replace(/\/+/g, '/');
}

function recordRoute(filePath, kind) {
  const resolvedPath = computeResolvedPath(filePath);
  const entry =
    routeMap.get(resolvedPath) ?? { page: [], layout: [], route: [] };
  entry[kind].push(filePath);
  routeMap.set(resolvedPath, entry);
}

function walk(dir, groupStack) {
  const entries = readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const nextGroupStack = [...groupStack];
      if (isGroupSegment(entry.name)) {
        const groupName = stripGroup(entry.name);
        nextGroupStack.push(groupName);

        if (groupName === 'dev' && groupStack.includes('user')) {
          errors.push(`Invalid nesting: (dev) under (user): ${fullPath}`);
        }
        if (groupName === 'user' && groupStack.includes('dev')) {
          errors.push(`Invalid nesting: (user) under (dev): ${fullPath}`);
        }
      }

      walk(fullPath, nextGroupStack);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name);
      const base = path.basename(entry.name, ext);
      if (!ROUTE_EXTENSIONS.has(ext) || !ROUTE_KINDS.includes(base)) {
        continue;
      }

      if (groupStack.some((group) => !ALLOWED_GROUPS.has(group))) {
        errors.push(`Route file outside allowed segment groups: ${fullPath}`);
      }

      recordRoute(fullPath, base);
    }
  }
}

function checkDuplicates() {
  for (const [resolvedPath, entry] of routeMap.entries()) {
    for (const kind of ROUTE_KINDS) {
      if (entry[kind].length > 1) {
        const files = [...entry[kind]].sort();
        errors.push(
          `Multiple files resolve to the same route path: ${resolvedPath} -> ${files.join(', ')}`,
        );
      }
    }
  }
}

function main() {
  walk(APP_DIR, []);
  checkDuplicates();

  if (errors.length > 0) {
    errors.forEach((message) => {
      console.error(message);
    });
    process.exitCode = 1;
  }
}

main();
