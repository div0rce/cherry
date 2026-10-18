import * as fs from 'node:fs';
import * as path from 'node:path';
import { ensureTsEsm } from './lib/ensure-ts-esm.mjs';
import { resolveRootArg } from './lib/root-arg.mjs';

ensureTsEsm();

// Rewrites only the docs/config-snapshot.md blocks whose file changed and keeps every other byte, so
// identical inputs give identical output and a second run is a no-op. Block shape (what
// check:config-snapshot parses): an opening fence, a `// <path>` line, the file's text without its
// final newline, a closing fence. A new config file still needs its block added by hand;
// check:config-snapshot names it.
const root = resolveRootArg(process.argv);
const snapshotPath = path.join(root, 'docs', 'config-snapshot.md');
const before = fs.readFileSync(snapshotPath, 'utf8');
const lines = before.split('\n');
const out: string[] = [];
const refreshed: string[] = [];

const isFence = (line: string | undefined): boolean => line !== undefined && line.trim().startsWith('```');

let i = 0;
while (i < lines.length) {
  const line = lines[i] ?? '';
  if (!isFence(line)) {
    out.push(line);
    i += 1;
    continue;
  }
  let end = i + 1;
  while (end < lines.length && !isFence(lines[end])) end += 1;
  const rel = /^\/\/ (\S+)$/.exec(lines[i + 1] ?? '')?.[1];
  const file = rel === undefined ? undefined : path.join(root, rel);
  if (rel === undefined || file === undefined || !fs.existsSync(file)) {
    out.push(...lines.slice(i, end + 1));
  } else {
    const body = lines.slice(i + 2, end);
    const text = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
    const fresh = (text.endsWith('\n') ? text.slice(0, -1) : text).split('\n');
    const changed = fresh.join('\n') !== body.join('\n');
    if (changed) refreshed.push(rel);
    out.push(line, lines[i + 1] ?? '', ...(changed ? fresh : body), ...lines.slice(end, end + 1));
  }
  i = end + 1;
}

if (refreshed.length === 0) {
  process.stdout.write('generate:config-snapshot: up to date\n');
} else {
  fs.writeFileSync(snapshotPath, out.join('\n'));
  process.stdout.write(`generate:config-snapshot: refreshed ${refreshed.join(', ')}\n`);
}
