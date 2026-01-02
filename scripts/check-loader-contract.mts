import fs from 'node:fs';
import path from 'node:path';
import { ensureTsEsm } from './lib/ensure-ts-esm.mjs';
import { fail } from './guardrails/lib/fail.mjs';

ensureTsEsm();

type LoaderFunction = {
  file: string;
  params: string[];
  body: string;
};

const ROOT = process.cwd();
const SCRIPTS_DIR = path.join(ROOT, 'scripts');
const PREFIX = 'check:loader-contract';
const FIX = 'Ensure loaders return the full LoaderResult contract.';

function guardrailFail(message: string): never {
  fail(PREFIX, message, { fix: FIX });
}

function walk(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(fullPath));
    } else {
      files.push(fullPath);
    }
  }
  return files;
}

function extractBlock(source: string, startIndex: number): { body: string; end: number } | null {
  let depth = 0;
  for (let i = startIndex; i < source.length; i += 1) {
    const char = source[i];
    if (char === '{') depth += 1;
    if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return { body: source.slice(startIndex + 1, i), end: i };
      }
    }
  }
  return null;
}

function parseParams(raw: string): string[] {
  return raw
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

function findLoadFunctions(file: string, content: string): LoaderFunction[] {
  const patterns = [
    /export\s+(?:async\s+)?function\s+load\s*\(([^)]*)\)\s*\{/g,
    /export\s+const\s+load\s*=\s*(?:async\s*)?\(([^)]*)\)\s*=>\s*\{/g,
    /export\s+const\s+load\s*=\s*(?:async\s*)?function\s*\(([^)]*)\)\s*\{/g,
  ];
  const found: LoaderFunction[] = [];
  for (const pattern of patterns) {
    for (const match of content.matchAll(pattern)) {
      const params = parseParams(match[1] ?? '');
      const matchIndex = match.index ?? 0;
      const braceIndex = matchIndex + match[0].lastIndexOf('{');
      const block = extractBlock(content, braceIndex);
      if (block === null) {
        guardrailFail(`Failed to parse load() body in ${file}`);
      }
      found.push({ file, params, body: block.body });
    }
  }
  return found;
}

function shouldCheckFile(file: string, content: string): boolean {
  const base = path.basename(file);
  if (base.includes('mock') || base.includes('loader')) return true;
  return /export\s+(?:async\s+)?function\s+load\s*\(/.test(content) ||
    /export\s+const\s+load\s*=/.test(content);
}

function validateReturnShapes(loader: LoaderFunction): void {
  const { file, params, body } = loader;
  if (params.length < 3) {
    guardrailFail(`load() must accept (url, context, defaultLoad) in ${file}`);
  }
  const defaultLoadName = params[2] ?? 'defaultLoad';
  const usesDefaultLoad = new RegExp(`\\b${defaultLoadName}\\s*\\(`).test(body);
  if (!usesDefaultLoad) {
    guardrailFail(`load() must delegate to ${defaultLoadName} in ${file}`);
  }
  if (/\breturn\s+undefined\b/.test(body)) {
    guardrailFail(`load() must not return undefined in ${file}`);
  }

  const returnRegex = /\breturn\s+([^;\n]+)/g;
  for (const match of body.matchAll(returnRegex)) {
    const expr = (match[1] ?? '').trim();
    if (expr.startsWith('{')) {
      const startIndex = body.indexOf('{', match.index ?? 0);
      const block = extractBlock(body, startIndex);
      if (block === null || block.body.includes('source:') === false) {
        guardrailFail(`return object missing source in ${file}`);
      }
      if (/source\s*:\s*source\b/.test(block.body)) {
        guardrailFail(`return object uses ambiguous source identifier in ${file}`);
      }
      continue;
    }
    if (expr.startsWith(`await ${defaultLoadName}(`) || expr.startsWith(`${defaultLoadName}(`)) {
      continue;
    }
    if (expr.startsWith('defaultLoad(') || expr.startsWith('await defaultLoad(')) {
      continue;
    }
  }
}

function main(): void {
  const files = walk(SCRIPTS_DIR).filter((file) => file.endsWith('.mts'));
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    if (!shouldCheckFile(file, content)) continue;
    const loaders = findLoadFunctions(path.relative(ROOT, file), content);
    for (const loader of loaders) {
      validateReturnShapes(loader);
    }
  }
}

main();
