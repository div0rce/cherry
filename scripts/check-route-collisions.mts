import { readdirSync, statSync } from 'node:fs';
import { join, sep } from 'node:path';
import { ensureTsEsm } from './lib/ensure-ts-esm.ts';

ensureTsEsm();


const APP_DIR = join(process.cwd(), 'app');

type RouteEntry = {
  filePath: string;
  routePath: string;
};

const routes: RouteEntry[] = [];

function computeRoutePath(filePath: string): string {
  const rel = filePath.split(APP_DIR)[1] ?? '';
  const segments = rel.split(sep).filter(Boolean);
  const visible = segments
    .slice(0, -1)
    .filter((seg) => !(seg.startsWith('(') && seg.endsWith(')')));
  const path = `/${visible.join('/')}`;
  return path === '' ? '/' : path;
}

function walk(dir: string): void {
  const entries = readdirSync(dir);
  for (const entry of entries) {
    const full = join(dir, entry);
    const stats = statSync(full);
    if (stats.isDirectory()) {
      walk(full);
    } else if (entry === 'page.tsx') {
      routes.push({ filePath: full, routePath: computeRoutePath(full) });
    }
  }
}

function main(): void {
  walk(APP_DIR);
  const byRoute = new Map<string, RouteEntry[]>();
  for (const r of routes) {
    const list = byRoute.get(r.routePath) ?? [];
    list.push(r);
    byRoute.set(r.routePath, list);
  }

  const collisions: [string, RouteEntry[]][] = [];
  for (const [routePath, list] of byRoute.entries()) {
    if (list.length > 1) {
      collisions.push([routePath, list]);
    }
  }

  if (collisions.length === 0) {
    console.warn('Route collision check: OK (no parallel pages).');
    return;
  }

  console.error('Route collision check: FAILED. Parallel pages detected:\n');
  for (const [routePath, list] of collisions) {
    console.error(`Route "${routePath}" is implemented by:`);
    for (const entry of list) {
      console.error(`  - ${entry.filePath}`);
    }
    console.error('');
  }
  process.exitCode = 1;
}

main();
