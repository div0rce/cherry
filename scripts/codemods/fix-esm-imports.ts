#!/usr/bin/env ts-node

let fs!: typeof import('node:fs');
let path!: typeof import('node:path');

const errorModulePromise = import('../guardrails/lib/error.mjs');

const ROOT: string = process.cwd();

const EXTENSIONS = new Set<string>(['.ts', '.tsx', '.mts', '.cts']);

function isSourceFile(file: string): boolean {
  return EXTENSIONS.has(path.extname(file));
}

function walk(dir: string, files: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, files);
    } else if (entry.isFile() && isSourceFile(full)) {
      files.push(full);
    }
  }
  return files;
}

const RELATIVE_IMPORT_RE =
  /from\s+['"](\.{1,2}\/[^'"]+)['"]/g;

function fixImports(source: string): string {
  return source.replace(
    RELATIVE_IMPORT_RE,
    (_match: string, rawSpecifier: string): string => {
      const specifier: string = rawSpecifier;

      // already has runtime-safe extension
      if (/\.(js|json)$/.test(specifier)) {
        return `from '${specifier}'`;
      }

      // strip TS extensions → .js
      if (/\.(ts|tsx|mts|cts)$/.test(specifier)) {
        return `from '${specifier.replace(/\.(ts|tsx|mts|cts)$/, '.js')}'`;
      }

      // bare relative → append .js
      return `from '${specifier}.js'`;
    }
  );
}

function run(): void {
  const files: string[] = walk(ROOT);
  let changed = 0;

  for (const file of files) {
    const before: string = fs.readFileSync(file, 'utf8');
    const after: string = fixImports(before);

    if (before !== after) {
      fs.writeFileSync(file, after);
      changed++;
      console.warn(`fixed: ${path.relative(ROOT, file)}`);
    }
  }

  console.warn(`Done. Modified ${changed} files.`);
}

Promise.all([import('node:fs'), import('node:path')])
  .then(([fsModule, pathModule]) => {
    fs = fsModule;
    path = pathModule;
    run();
  })
  .catch((error: unknown) => {
    return errorModulePromise
      .then((errorModule) => {
        console.error(errorModule.asMessage(error));
        process.exit(1);
      })
      .catch((importError: unknown) => {
        console.error(importError);
        process.exit(1);
      });
  });
