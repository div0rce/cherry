import * as fs from 'node:fs';
import * as path from 'node:path';
import { ensureTsEsm } from './lib/ensure-ts-esm.mjs';
import { fail } from './guardrails/lib/fail.mjs';
import { readJsonFile } from './guardrails/lib/read-json.mjs';
import {
  hashReplayPayload,
  replayIndexFilename,
  replayObjectPath,
  replayObjectRelativePath,
  type ReplayPayload,
  type VersionSnapshot,
} from './lib/replay-payload.mjs';

ensureTsEsm();

const ROOT = process.cwd();
const REPLAY_ROOT = path.join(ROOT, 'tests', 'replay');
const OBJECTS_ROOT = path.join(REPLAY_ROOT, 'objects');
const INDEX_ROOT = path.join(REPLAY_ROOT, 'index');
const PREFIX = 'check:replay-object-store';
const FIX = 'Run replay migration and remove inline replay payload files.';

type IndexRecord = {
  versions: VersionSnapshot;
  hashes: string[];
};

function guardrailFail(message: string, details: string[]): never {
  fail(PREFIX, message, { details, fix: FIX });
}

function sortEntries(entries: fs.Dirent[]): fs.Dirent[] {
  return entries.slice().sort((a, b) => {
    if (a.name < b.name) return -1;
    if (a.name > b.name) return 1;
    return 0;
  });
}

function collectJsonFiles(root: string): string[] {
  const results: string[] = [];
  const stack = [root];
  while (stack.length > 0) {
    const current = stack.pop();
    if (current === undefined) continue;
    if (!fs.existsSync(current)) continue;
    const stat = fs.lstatSync(current);
    if (stat.isFile()) {
      if (current.endsWith('.json')) {
        results.push(current);
      }
      continue;
    }
    if (!stat.isDirectory()) continue;
    const entries = sortEntries(fs.readdirSync(current, { withFileTypes: true }));
    for (let i = entries.length - 1; i >= 0; i -= 1) {
      const entry = entries[i];
      if (entry === undefined) continue;
      stack.push(path.join(current, entry.name));
    }
  }
  results.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  return results;
}

function parseVersions(value: unknown, context: string): VersionSnapshot {
  if (value === null || typeof value !== 'object') {
    guardrailFail('Invalid replay index versions', [context]);
  }
  const record = value as Record<string, unknown>;
  const engineBehaviorVersion = record['engineBehaviorVersion'];
  const engineInputVersion = record['engineInputVersion'];
  const engineCandidateSpaceVersion = record['engineCandidateSpaceVersion'];
  const engineAccountingVersion = record['engineAccountingVersion'];
  if (typeof engineBehaviorVersion !== 'string') {
    guardrailFail('Invalid replay index versions', [`${context}: missing engineBehaviorVersion`]);
  }
  if (typeof engineInputVersion !== 'string') {
    guardrailFail('Invalid replay index versions', [`${context}: missing engineInputVersion`]);
  }
  if (typeof engineCandidateSpaceVersion !== 'string') {
    guardrailFail('Invalid replay index versions', [`${context}: missing engineCandidateSpaceVersion`]);
  }
  if (typeof engineAccountingVersion !== 'string') {
    guardrailFail('Invalid replay index versions', [`${context}: missing engineAccountingVersion`]);
  }
  return {
    engineBehaviorVersion,
    engineInputVersion,
    engineCandidateSpaceVersion,
    engineAccountingVersion,
  };
}

function parseIndex(filePath: string): IndexRecord {
  const raw = readJsonFile(filePath);
  if (raw === null || typeof raw !== 'object') {
    guardrailFail('Invalid replay index', [path.relative(ROOT, filePath)]);
  }
  const record = raw as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  if (keys.length !== 2 || keys[0] !== 'hashes' || keys[1] !== 'versions') {
    guardrailFail('Replay index contains unexpected keys', [path.relative(ROOT, filePath), keys.join(',')]);
  }
  const versions = parseVersions(record['versions'], path.relative(ROOT, filePath));
  const hashesRaw = record['hashes'];
  if (!Array.isArray(hashesRaw)) {
    guardrailFail('Invalid replay index hashes', [path.relative(ROOT, filePath)]);
  }
  const hashes: string[] = [];
  for (const entry of hashesRaw) {
    if (typeof entry !== 'string') {
      guardrailFail('Invalid replay index hash', [path.relative(ROOT, filePath)]);
    }
    hashes.push(entry);
  }
  return { versions, hashes };
}

function assertIndexFilename(filePath: string, versions: VersionSnapshot): void {
  const expected = replayIndexFilename(versions);
  const actual = path.basename(filePath);
  if (expected !== actual) {
    guardrailFail('Replay index filename mismatch', [
      path.relative(ROOT, filePath),
      `expected ${expected}`,
    ]);
  }
}

function extractObjectHash(filePath: string): string {
  const rel = path.relative(OBJECTS_ROOT, filePath);
  const parts = rel.split(path.sep);
  if (parts.length !== 3) {
    guardrailFail('Replay object path must be objects/aa/bb/<hash>.json', [rel]);
  }
  const prefix = parts[0];
  const bucket = parts[1];
  const fileName = parts[2];
  if (fileName === undefined || prefix === undefined || bucket === undefined) {
    guardrailFail('Replay object path must be objects/aa/bb/<hash>.json', [rel]);
  }
  const hash = fileName.replace(/\.json$/, '');
  if (fileName !== `${hash}.json`) {
    guardrailFail('Replay object filename must end with .json', [rel]);
  }
  if (hash.slice(0, 2) !== prefix || hash.slice(2, 4) !== bucket) {
    guardrailFail('Replay object prefix mismatch', [rel]);
  }
  const expectedRel = replayObjectRelativePath(hash);
  const relFromReplay = path.relative(REPLAY_ROOT, filePath);
  if (expectedRel !== relFromReplay) {
    guardrailFail('Replay object path mismatch', [relFromReplay, `expected ${expectedRel}`]);
  }
  return hash;
}

function main(): void {
  if (!fs.existsSync(REPLAY_ROOT)) {
    guardrailFail('tests/replay missing', []);
  }

  const rootEntries = sortEntries(fs.readdirSync(REPLAY_ROOT, { withFileTypes: true }));
  const allowedRootDirs = new Set(['objects', 'index', '_staging']);
  const allowedRootFiles = new Set(['README.md']);
  for (const entry of rootEntries) {
    if (entry.isDirectory()) {
      if (!allowedRootDirs.has(entry.name)) {
        guardrailFail('Unexpected replay root directory', [entry.name]);
      }
      continue;
    }
    if (entry.isFile()) {
      if (!allowedRootFiles.has(entry.name)) {
        guardrailFail('Unexpected replay root file', [entry.name]);
      }
      continue;
    }
  }

  const jsonFiles = collectJsonFiles(REPLAY_ROOT);
  const illegalJson = jsonFiles.filter((filePath) => {
    if (filePath.startsWith(OBJECTS_ROOT)) return false;
    if (filePath.startsWith(INDEX_ROOT)) return false;
    if (filePath.includes(`${path.sep}_staging${path.sep}`)) return false;
    return true;
  });
  if (illegalJson.length > 0) {
    guardrailFail('Inline replay payloads are forbidden outside objects/', illegalJson.map((filePath) => path.relative(ROOT, filePath)));
  }

  if (!fs.existsSync(OBJECTS_ROOT)) {
    guardrailFail('Replay objects root missing', [path.relative(ROOT, OBJECTS_ROOT)]);
  }
  if (!fs.existsSync(INDEX_ROOT)) {
    guardrailFail('Replay index root missing', [path.relative(ROOT, INDEX_ROOT)]);
  }

  const indexEntries = sortEntries(fs.readdirSync(INDEX_ROOT, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .map((entry) => path.join(INDEX_ROOT, entry.name));

  if (indexEntries.length === 0) {
    guardrailFail('Replay index missing', [path.relative(ROOT, INDEX_ROOT)]);
  }

  const referencedHashes = new Set<string>();
  for (const indexPath of indexEntries) {
    const index = parseIndex(indexPath);
    assertIndexFilename(indexPath, index.versions);
    const seen = new Set<string>();
    for (const hash of index.hashes) {
      if (seen.has(hash)) {
        guardrailFail('Duplicate replay hash in index', [path.relative(ROOT, indexPath), hash]);
      }
      seen.add(hash);
      referencedHashes.add(hash);
      const objectPath = replayObjectPath(REPLAY_ROOT, hash);
      if (!fs.existsSync(objectPath)) {
        guardrailFail('Replay object missing', [path.relative(ROOT, objectPath)]);
      }
    }
  }

  const objectFiles = collectJsonFiles(OBJECTS_ROOT);
  const objectHashes = new Set<string>();
  const objectHashToPath = new Map<string, string>();
  for (const filePath of objectFiles) {
    const hash = extractObjectHash(filePath);
    const payload = readJsonFile(filePath) as ReplayPayload;
    const computedHash = hashReplayPayload(payload);
    if (computedHash !== hash) {
      guardrailFail('Replay object hash mismatch', [path.relative(ROOT, filePath), computedHash]);
    }
    const existingPath = objectHashToPath.get(hash);
    if (existingPath !== undefined && existingPath !== filePath) {
      guardrailFail('Duplicate replay object hash', [path.relative(ROOT, existingPath), path.relative(ROOT, filePath)]);
    }
    objectHashToPath.set(hash, filePath);
    objectHashes.add(hash);
  }

  const orphans = Array.from(objectHashes).filter((hash) => !referencedHashes.has(hash));
  if (orphans.length > 0) {
    guardrailFail('Replay objects without index reference', orphans);
  }

  process.stdout.write('check:replay-object-store: ok\n');
}

main();
