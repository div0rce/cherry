import * as fs from 'node:fs';
import * as path from 'node:path';
import { ensureTsEsm } from '../lib/ensure-ts-esm.mjs';
import { asMessage } from '../guardrails/lib/error.mjs';
import { fail } from '../guardrails/lib/fail.mjs';
import { readJsonFile } from '../guardrails/lib/read-json.mjs';
import { hashReplayPayload, normalizeJson, type ReplayPayload } from '../lib/replay-payload.mjs';

ensureTsEsm();

const ROOT = process.cwd();
const REPLAY_ROOT = path.join(ROOT, 'tests', 'replay');
const BLOBS_ROOT = path.join(REPLAY_ROOT, 'blobs');
const PREFIX = 'replay-migrate';
const FIX = 'Ensure tests/replay fixtures are present and readable.';

function writeJson(filePath: string, value: unknown): void {
  const normalized = normalizeJson(value);
  const output = `${JSON.stringify(normalized, null, 2)}\n`;
  fs.writeFileSync(filePath, output, 'utf8');
}

function isEmpty(filePath: string): boolean {
  if (!fs.existsSync(filePath)) return true;
  return fs.statSync(filePath).size === 0;
}

function listTraceDirs(root: string): string[] {
  const results: string[] = [];
  const stack = [root];
  while (stack.length > 0) {
    const current = stack.pop();
    if (current === undefined) continue;
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (entry.name === 'blobs' || entry.name === '_staging') continue;
      const fullPath = path.join(current, entry.name);
      const inputPath = path.join(fullPath, 'input.json');
      if (fs.existsSync(inputPath)) {
        results.push(fullPath);
      } else {
        stack.push(fullPath);
      }
    }
  }
  return results;
}

function loadJson(filePath: string): unknown {
  try {
    return readJsonFile(filePath);
  } catch (error: unknown) {
    const message = asMessage(error);
    fail(PREFIX, `Failed to parse ${path.relative(ROOT, filePath)}: ${message}`, { fix: FIX });
  }
}

function migrateTrace(dir: string): void {
  const inputPath = path.join(dir, 'input.json');
  const outputPath = path.join(dir, 'output.json');
  const metaPath = path.join(dir, 'meta.json');
  const versionsPath = path.join(dir, 'versions.json');
  const payloadRefPath = path.join(dir, 'payload.json');

  if (isEmpty(inputPath)) {
    if (fs.existsSync(payloadRefPath) === false) {
      fs.writeFileSync(payloadRefPath, '', 'utf8');
    }
    fs.rmSync(inputPath, { force: true });
    fs.rmSync(outputPath, { force: true });
    fs.rmSync(metaPath, { force: true });
    if (fs.existsSync(versionsPath) === false) {
      fs.writeFileSync(versionsPath, '', 'utf8');
    }
    return;
  }

  const input = loadJson(inputPath);
  const output = loadJson(outputPath);
  const meta = loadJson(metaPath);
  const payload: ReplayPayload = { input, output, meta };
  const hash = hashReplayPayload(payload);

  const blobDir = path.join(BLOBS_ROOT, hash);
  fs.mkdirSync(blobDir, { recursive: true });
  writeJson(path.join(blobDir, 'input.json'), input);
  writeJson(path.join(blobDir, 'output.json'), output);
  writeJson(path.join(blobDir, 'meta.json'), meta);

  writeJson(payloadRefPath, { hash });
  fs.rmSync(inputPath, { force: true });
  fs.rmSync(outputPath, { force: true });
  fs.rmSync(metaPath, { force: true });
}

function main(): void {
  if (!fs.existsSync(REPLAY_ROOT)) {
    fail(PREFIX, 'tests/replay missing', { fix: FIX });
  }
  fs.mkdirSync(BLOBS_ROOT, { recursive: true });
  const traces = listTraceDirs(REPLAY_ROOT);
  for (const dir of traces) {
    migrateTrace(dir);
  }
  process.stdout.write(`replay-migrate: ok (${traces.length} traces)\n`);
}

main();
