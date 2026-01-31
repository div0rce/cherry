import * as fs from 'node:fs';
import * as path from 'node:path';
import { ensureTsEsm } from '../lib/ensure-ts-esm.mjs';
import { asMessage } from '../guardrails/lib/error.mjs';
import { fail } from '../guardrails/lib/fail.mjs';
import { readJsonFile } from '../guardrails/lib/read-json.mjs';
import {
  hashReplayPayload,
  normalizeJson,
  replayIndexFilename,
  replayObjectPath,
  type ReplayPayload,
  type VersionSnapshot,
} from '../lib/replay-payload.mjs';

ensureTsEsm();

const ROOT = process.cwd();
const REPLAY_ROOT = path.join(ROOT, 'tests', 'replay');
const OBJECTS_ROOT = path.join(REPLAY_ROOT, 'objects');
const INDEX_ROOT = path.join(REPLAY_ROOT, 'index');
const LEGACY_BLOBS_ROOT = path.join(REPLAY_ROOT, 'blobs');
const PREFIX = 'replay-migrate';
const FIX = 'Ensure tests/replay fixtures are present and readable.';

function writeJson(filePath: string, value: unknown): void {
  const normalized = normalizeJson(value);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const output = `${JSON.stringify(normalized, null, 2)}\n`;
  fs.writeFileSync(filePath, output, 'utf8');
}

function isEmpty(filePath: string): boolean {
  if (!fs.existsSync(filePath)) return true;
  return fs.statSync(filePath).size === 0;
}

function sortEntries(entries: fs.Dirent[]): fs.Dirent[] {
  return entries.slice().sort((a, b) => {
    if (a.name < b.name) return -1;
    if (a.name > b.name) return 1;
    return 0;
  });
}

function listTraceDirs(root: string): string[] {
  const results: string[] = [];
  const stack = [root];
  while (stack.length > 0) {
    const current = stack.pop();
    if (current === undefined) continue;
    const entries = sortEntries(fs.readdirSync(current, { withFileTypes: true }));
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (entry.name === 'objects' || entry.name === 'index' || entry.name === '_staging') continue;
      if (entry.name === 'blobs') continue;
      const fullPath = path.join(current, entry.name);
      const payloadRefPath = path.join(fullPath, 'payload.json');
      const inputPath = path.join(fullPath, 'input.json');
      if (fs.existsSync(payloadRefPath) || fs.existsSync(inputPath)) {
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

function parseVersions(value: unknown, context: string): VersionSnapshot {
  if (value === null || typeof value !== 'object') {
    fail(PREFIX, `${context}: versions must be an object`, { fix: FIX });
  }
  const record = value as Record<string, unknown>;
  const engineBehaviorVersion = record['engineBehaviorVersion'];
  const engineInputVersion = record['engineInputVersion'];
  const engineCandidateSpaceVersion = record['engineCandidateSpaceVersion'];
  const engineAccountingVersion = record['engineAccountingVersion'];
  if (typeof engineBehaviorVersion !== 'string') {
    fail(PREFIX, `${context}: missing engineBehaviorVersion`, { fix: FIX });
  }
  if (typeof engineInputVersion !== 'string') {
    fail(PREFIX, `${context}: missing engineInputVersion`, { fix: FIX });
  }
  if (typeof engineCandidateSpaceVersion !== 'string') {
    fail(PREFIX, `${context}: missing engineCandidateSpaceVersion`, { fix: FIX });
  }
  if (typeof engineAccountingVersion !== 'string') {
    fail(PREFIX, `${context}: missing engineAccountingVersion`, { fix: FIX });
  }
  return {
    engineBehaviorVersion,
    engineInputVersion,
    engineCandidateSpaceVersion,
    engineAccountingVersion,
  };
}

function loadPayloadFromBlob(hash: string): ReplayPayload | null {
  const blobDir = path.join(LEGACY_BLOBS_ROOT, hash);
  const inputPath = path.join(blobDir, 'input.json');
  const outputPath = path.join(blobDir, 'output.json');
  const metaPath = path.join(blobDir, 'meta.json');
  if (!fs.existsSync(inputPath) || !fs.existsSync(outputPath) || !fs.existsSync(metaPath)) {
    return null;
  }
  const input = loadJson(inputPath);
  const output = loadJson(outputPath);
  const meta = loadJson(metaPath);
  return { input, output, meta };
}

function loadPayloadFromTrace(dir: string): ReplayPayload | null {
  const inputPath = path.join(dir, 'input.json');
  const outputPath = path.join(dir, 'output.json');
  const metaPath = path.join(dir, 'meta.json');
  if (!fs.existsSync(inputPath) || !fs.existsSync(outputPath) || !fs.existsSync(metaPath)) {
    return null;
  }
  const input = loadJson(inputPath);
  const output = loadJson(outputPath);
  const meta = loadJson(metaPath);
  return { input, output, meta };
}

function loadPayloadFromObject(hash: string): ReplayPayload | null {
  const objectPath = replayObjectPath(REPLAY_ROOT, hash);
  if (!fs.existsSync(objectPath)) return null;
  const payload = loadJson(objectPath);
  if (payload === null || typeof payload !== 'object') {
    fail(PREFIX, `${path.relative(ROOT, objectPath)}: invalid payload`, { fix: FIX });
  }
  const record = payload as Record<string, unknown>;
  return {
    input: record['input'],
    output: record['output'],
    meta: record['meta'],
  };
}

function ensureObject(hash: string, payload: ReplayPayload): void {
  const objectPath = replayObjectPath(REPLAY_ROOT, hash);
  if (fs.existsSync(objectPath)) {
    const existing = loadJson(objectPath);
    const existingPayload = existing as ReplayPayload;
    const existingHash = hashReplayPayload(existingPayload);
    if (existingHash !== hash) {
      fail(PREFIX, `Replay object hash mismatch for ${hash}`, { fix: FIX });
    }
    return;
  }
  writeJson(objectPath, payload);
  const written = loadJson(objectPath) as ReplayPayload;
  const writtenHash = hashReplayPayload(written);
  if (writtenHash !== hash) {
    fail(PREFIX, `Replay object hash mismatch for ${hash}`, { fix: FIX });
  }
}

function collectSize(root: string): number {
  if (!fs.existsSync(root)) return 0;
  let total = 0;
  const stack = [root];
  while (stack.length > 0) {
    const current = stack.pop();
    if (current === undefined) continue;
    const stat = fs.lstatSync(current);
    if (stat.isFile()) {
      total += stat.size;
      continue;
    }
    if (stat.isDirectory()) {
      const entries = sortEntries(fs.readdirSync(current, { withFileTypes: true }));
      for (let i = entries.length - 1; i >= 0; i -= 1) {
        const entry = entries[i];
        if (entry === undefined) continue;
        stack.push(path.join(current, entry.name));
      }
    }
  }
  return total;
}

function pruneEmptyDirs(root: string): void {
  if (!fs.existsSync(root)) return;
  const entries = sortEntries(fs.readdirSync(root, { withFileTypes: true }));
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const fullPath = path.join(root, entry.name);
    if (['objects', 'index', '_staging'].includes(entry.name)) continue;
    pruneEmptyDirs(fullPath);
  }
  if (root === REPLAY_ROOT) return;
  const remaining = fs.readdirSync(root);
  if (remaining.length === 0) {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

function main(): void {
  if (!fs.existsSync(REPLAY_ROOT)) {
    fail(PREFIX, 'tests/replay missing', { fix: FIX });
  }

  const beforeBytes = collectSize(REPLAY_ROOT);

  fs.mkdirSync(OBJECTS_ROOT, { recursive: true });
  fs.mkdirSync(INDEX_ROOT, { recursive: true });

  const traces = listTraceDirs(REPLAY_ROOT);
  const indexMap = new Map<string, { versions: VersionSnapshot; hashes: Set<string> }>();

  for (const dir of traces) {
    const payloadRefPath = path.join(dir, 'payload.json');
    const versionsPath = path.join(dir, 'versions.json');

    if (isEmpty(payloadRefPath)) {
      fs.rmSync(dir, { recursive: true, force: true });
      continue;
    }

    if (isEmpty(versionsPath)) {
      fail(PREFIX, `${path.relative(ROOT, dir)}: versions.json missing`, { fix: FIX });
    }

    const versions = parseVersions(loadJson(versionsPath), path.relative(ROOT, versionsPath));
    const payloadRef = loadJson(payloadRefPath) as { hash?: string };
    const hash = payloadRef.hash;
    if (typeof hash !== 'string' || hash.length === 0) {
      fail(PREFIX, `${path.relative(ROOT, payloadRefPath)}: payload hash missing`, { fix: FIX });
    }

    let payload = loadPayloadFromObject(hash);
    if (payload === null) payload = loadPayloadFromBlob(hash);
    if (payload === null) payload = loadPayloadFromTrace(dir);
    if (payload === null) {
      fail(PREFIX, `${path.relative(ROOT, dir)}: missing payload content for ${hash}`, { fix: FIX });
    }

    const payloadHash = hashReplayPayload(payload);
    if (payloadHash !== hash) {
      fail(PREFIX, `${path.relative(ROOT, dir)}: payload hash mismatch`, { fix: FIX });
    }

    ensureObject(hash, payload);

    const indexName = replayIndexFilename(versions);
    const existing = indexMap.get(indexName);
    if (existing !== undefined) {
      existing.hashes.add(hash);
    } else {
      indexMap.set(indexName, { versions, hashes: new Set([hash]) });
    }

    fs.rmSync(dir, { recursive: true, force: true });
  }

  if (fs.existsSync(LEGACY_BLOBS_ROOT)) {
    fs.rmSync(LEGACY_BLOBS_ROOT, { recursive: true, force: true });
  }

  for (const [indexName, entry] of indexMap.entries()) {
    const hashes = Array.from(entry.hashes);
    hashes.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    const indexPath = path.join(INDEX_ROOT, indexName);
    writeJson(indexPath, { versions: entry.versions, hashes });
  }

  pruneEmptyDirs(REPLAY_ROOT);

  const afterBytes = collectSize(REPLAY_ROOT);
  process.stdout.write(
    `replay-migrate: ok (${traces.length} traces, before=${beforeBytes}B, after=${afterBytes}B)\n`
  );
}

main();
