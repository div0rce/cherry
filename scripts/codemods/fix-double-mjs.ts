#!/usr/bin/env ts-node

function main(): void {
  let fsModule!: typeof import('node:fs');
  let pathModule!: typeof import('node:path');

  const errorModulePromise = import('../guardrails/lib/error.mjs');
  const ROOT = process.cwd();
  const EXTENSIONS = new Set(['.ts', '.tsx', '.mts', '.cts']);

  function walk(dir: string, files: string[] = []): string[] {
    for (const entry of fsModule.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
      const full = pathModule.join(dir, entry.name);
      if (entry.isDirectory()) walk(full, files);
      else if (entry.isFile() && EXTENSIONS.has(pathModule.extname(full))) {
        files.push(full);
      }
    }
    return files;
  }

  function fix(source: string): string {
    return source
      // fix .mjs.js → .mjs
      .replace(/\.mjs\.js(['"])/g, '.mjs$1')
      // fix .mts.js → .mjs
      .replace(/\.mts\.js(['"])/g, '.mjs$1');
  }

  function run(): void {
    const files = walk(ROOT);
    let changed = 0;

    for (const file of files) {
      const before = fsModule.readFileSync(file, 'utf8');
      const after = fix(before);
      if (before !== after) {
        fsModule.writeFileSync(file, after);
        changed++;
        console.warn(`fixed: ${pathModule.relative(ROOT, file)}`);
      }
    }

    console.warn(`Done. Repaired ${changed} files.`);
  }

  Promise.all([import('node:fs'), import('node:path')])
    .then(([fsImport, pathImport]) => {
      fsModule = fsImport;
      pathModule = pathImport;
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
}

main();
