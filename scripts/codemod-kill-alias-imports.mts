import fs from 'node:fs';
import path from 'node:path';
import fg from 'fast-glob';
import { ensureTsEsm } from './lib/ensure-ts-esm.mts';

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
    (...args) => {
      const fromPrefix = args[1];
      const fromSpec = args[2];
      const fromSuffix = args[3];
      const dynPrefix = args[4];
      const dynSpec = args[5];
      const dynSuffix = args[6];

      const spec = fromSpec ?? dynSpec;
      if (!spec) return args[0];
      if (!spec.startsWith('@/')) return args[0];

      const repoTargetAbs = path.join(ROOT, spec.slice(2));
      const fromDir = path.dirname(fileAbs);

      let rel = path.relative(fromDir, repoTargetAbs);
      rel = toPosix(rel);

      if (!rel.startsWith('.')) rel = `./${rel}`;
      rel = addJsExtension(rel);

      changed = true;

      if (fromPrefix) return `${fromPrefix}${rel}${fromSuffix}`;
      return `${dynPrefix}${rel}${dynSuffix}`;
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
      !content.includes('import("...js') &&
      !content.includes("import('...js")
    ) {
      continue;
    }

    if (rewriteFile(file)) updated += 1;
  }

  console.log(`codemod-kill-alias-imports: updated ${updated} files`);
}

main();
