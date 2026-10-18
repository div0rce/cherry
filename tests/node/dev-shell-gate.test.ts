import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

// Every page in app/(dev) must be matched by proxy.ts, which returns 403 for dev pages in
// production. Seven dev pages (including /admin) once shipped outside the matcher.

const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), '..', '..');
const devRoot = path.join(repoRoot, 'app', '(dev)');

function pageUrls(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return pageUrls(full);
    if (entry.name !== 'page.tsx') return [];
    const rel = path.relative(devRoot, path.dirname(full)).split(path.sep).join('/');
    // Dynamic segments become a concrete value; route groups do not appear in the URL.
    const url = `/${rel}`.replace(/\[[^\]]+\]/g, 'x').replace(/\/\([^)]+\)/g, '');
    return [url === '/' ? '/' : url.replace(/\/$/, '')];
  });
}

// Next matcher syntax used here: literal paths, or `<prefix>/:path*` (prefix and anything below).
function toRegex(matcher: string): RegExp {
  const escaped = matcher.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^${escaped.replace(/\/:path\*$/, '(?:/.*)?')}$`);
}

const proxySource = fs.readFileSync(path.join(repoRoot, 'proxy.ts'), 'utf8');
const matcherBlock = /matcher:\s*\[([^\]]*)\]/.exec(proxySource)?.[1] ?? '';
const matchers = [...matcherBlock.matchAll(/'([^']+)'/g)].map((match) => toRegex(match[1] ?? ''));
assert.ok(matchers.length > 0, 'proxy.ts matcher not found');

const urls = pageUrls(devRoot);
assert.ok(urls.includes('/admin') && urls.includes('/dev'), `unexpected dev pages: ${urls.join(', ')}`);
const ungated = urls.filter((url) => !matchers.some((regex) => regex.test(url)));
assert.deepEqual(ungated, [], `dev pages not gated by proxy.ts: ${ungated.join(', ')}`);

// User routes and user APIs must stay outside the dev gate.
for (const url of ['/app', '/buckets', '/history', '/signin', '/api/sessions', '/api/scan', '/sessionsx']) {
  assert.equal(matchers.some((regex) => regex.test(url)), false, `${url} must not be dev-gated`);
}

process.stdout.write('dev-shell-gate: ok\n');
