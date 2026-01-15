#!/usr/bin/env ts-node

let fs!: typeof import('node:fs');
let path!: typeof import('node:path');

const errorModulePromise = import('../guardrails/lib/error.mjs');

const ROOT = process.cwd();

const EXTENSIONS = new Set(['.ts', '.tsx', '.mts', '.cts']);

function walk(dir: string, files: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (entry.isFile() && EXTENSIONS.has(path.extname(full))) {
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
    const before = fs.readFileSync(file, 'utf8');
    const after = fix(before);
    if (before !== after) {
      fs.writeFileSync(file, after);
      changed++;
      console.warn(`fixed: ${path.relative(ROOT, file)}`);
    }
  }

  console.warn(`Done. Repaired ${changed} files.`);
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
        console.error(errorModule.asError(error));
        process.exit(1);
      })
      .catch((importError: unknown) => {
        console.error(importError);
        process.exit(1);
      });
  });
