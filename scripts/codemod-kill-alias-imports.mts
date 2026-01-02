import fs from 'node:fs';
import path from 'node:path';
import fg from 'fast-glob';
import { ensureTsEsm } from './lib/ensure-ts-esm.mjs';

ensureTsEsm();

const ROOT = process.cwd();
const TARGET_GLOBS = [
  'app/**/*.{ts,tsx}',
  'lib/**/*.{ts,tsx}',
  'components/**/*.{ts,tsx}',
  'middleware.ts',
  'next.config.ts',
  'tests/**/*.{ts,tsx,js,mjs}',
  'scripts/**/*.{ts,tsx,mts}',
];

const EXT_RE = /\.(ts|tsx|js|mjs|cjs|json)$/;

function toPosix(p: string): string {
  return p.split(path.sep).join('/');
}

function addJsExtension(relNoExt: string): string {
  if (EXT_RE.test(relNoExt)) return relNoExt;
  return `${relNoExt}.js`;
}

function rewriteFile(fileAbs: string): boolean {
  const src = fs.readFileSync(fileAbs, 'utf8');
  let changed = false;

  const out = src.replace(
    /(from\s+['"])([^'"]+)(['"])|(\bimport\s*\(\s*['"])([^'"]+)(['"]\s*\))/g,
    (
      match: string,
      fromPrefix: string | undefined,
      fromSpec: string | undefined,
      fromSuffix: string | undefined,
      dynPrefix: string | undefined,
      dynSpec: string | undefined,
      dynSuffix: string | undefined
    ): string => {
      const spec = fromSpec ?? dynSpec;
      if (spec === undefined || spec === '') return match;
      if (!spec.startsWith('@/')) return match;

      const repoTargetAbs = path.join(ROOT, spec.slice(2));
      const fromDir = path.dirname(fileAbs);

      let rel = path.relative(fromDir, repoTargetAbs);
      rel = toPosix(rel);

      if (!rel.startsWith('.')) rel = `./${rel}`;
      rel = addJsExtension(rel);

      changed = true;

      if (fromPrefix !== undefined && fromSuffix !== undefined) {
        return `${fromPrefix}${rel}${fromSuffix}`;
      }
      if (dynPrefix !== undefined && dynSuffix !== undefined) {
        return `${dynPrefix}${rel}${dynSuffix}`;
      }
      return match;
    }
  );

  if (changed) fs.writeFileSync(fileAbs, out);
  return changed;
}

function main(): void {
  const files = fg.sync(TARGET_GLOBS, { cwd: ROOT, absolute: true, dot: false });
  let updated = 0;

  for (const file of files) {
    const rel = path.relative(ROOT, file);
    if (rel.includes('node_modules')) continue;

    const content = fs.readFileSync(file, 'utf8');
    if (
      !content.includes("'@/") &&
      !content.includes('"@/') &&
      !content.includes('import("..') &&
      !content.includes("import('..")
    ) {
      continue;
    }

    if (rewriteFile(file)) updated += 1;
  }

  process.stdout.write(`codemod-kill-alias-imports: updated ${updated} files\n`);
}

main();
