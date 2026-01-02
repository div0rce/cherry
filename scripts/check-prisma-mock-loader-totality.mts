import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { ensureTsEsm } from './lib/ensure-ts-esm.mjs';
import { asMessage } from './guardrails/lib/error.mjs';
import { fail } from './guardrails/lib/fail.mjs';
import { load, loadSync } from './lib/prisma-mock.mjs';

ensureTsEsm();

const PREFIX = 'check:prisma-mock-loader-totality';
const FIX = 'Ensure prisma mock loader returns format/source for all load paths.';

type LoadResult = {
  format?: string | null;
  source?: string | ArrayBuffer | ArrayBufferView;
};

const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), '..');
const requireFn = createRequire(import.meta.url);
const NON_FILE_SOURCE = 'export const ok = true;';

function isValidSource(source: unknown): source is string | ArrayBuffer | ArrayBufferView {
  if (typeof source === 'string') return true;
  if (source instanceof ArrayBuffer) return true;
  return ArrayBuffer.isView(source);
}

async function nextLoad(url: string): Promise<LoadResult> {
  if (!url.startsWith('file://')) {
    return { format: 'module', source: NON_FILE_SOURCE };
  }
  const filePath = fileURLToPath(url);
  const source = fs.readFileSync(filePath, 'utf8');
  return { format: 'module', source };
}

function nextLoadSync(url: string): LoadResult {
  if (!url.startsWith('file://')) {
    return { format: 'module', source: NON_FILE_SOURCE };
  }
  const filePath = fileURLToPath(url);
  const source = fs.readFileSync(filePath, 'utf8');
  return { format: 'module', source };
}

function assertResult(label: string, url: string, result: LoadResult): void {
  if (result === null || typeof result !== 'object') {
    fail(PREFIX, `${label}: load() returned non-object`, {
      details: [`url=${url}`],
      fix: FIX,
    });
  }
  const { format, source } = result;
  if (format === undefined || format === null) {
    fail(PREFIX, `${label}: load() returned missing format`, {
      details: [`url=${url}`],
      fix: FIX,
    });
  }
  if (!isValidSource(source)) {
    fail(PREFIX, `${label}: load() returned missing source`, {
      details: [`url=${url}`],
      fix: FIX,
    });
  }
}

async function main(): Promise<void> {
  const prismaEntry = requireFn.resolve('@prisma/client');
  const moduleEntry = requireFn.resolve('next-auth');
  const fixtureEntry = path.join(repoRoot, 'tests', 'fixtures', 'loader', 'sentinel-ok.ts');

  const prismaUrl = pathToFileURL(prismaEntry).href;
  const moduleUrl = pathToFileURL(moduleEntry).href;
  const fixtureUrl = pathToFileURL(fixtureEntry).href;

  const prismaResult = await load(prismaUrl, {}, nextLoad);
  assertResult('prisma-runtime', prismaUrl, prismaResult);

  const fixtureResult = await load(fixtureUrl, {}, nextLoad);
  assertResult('fixture', fixtureUrl, fixtureResult);

  const moduleResult = await load(moduleUrl, {}, nextLoad);
  assertResult('node-module', moduleUrl, moduleResult);

  if (typeof loadSync === 'function') {
    const prismaSync = loadSync(prismaUrl, {}, nextLoadSync);
    assertResult('prisma-runtime-sync', prismaUrl, prismaSync);

    const fixtureSync = loadSync(fixtureUrl, {}, nextLoadSync);
    assertResult('fixture-sync', fixtureUrl, fixtureSync);

    const moduleSync = loadSync(moduleUrl, {}, nextLoadSync);
    assertResult('node-module-sync', moduleUrl, moduleSync);
  }
}

void main().catch((error: unknown) => {
  const message = asMessage(error);
  fail(PREFIX, `Prisma mock loader totality check failed: ${message}`, { fix: FIX });
});
