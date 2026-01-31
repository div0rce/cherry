import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { validateEngineInput } from '../../../../lib/engine/input/validate.js';
import {
  buildEngineContextFromInput,
  buildEngineStateFromInput,
  buildSolverOptionsFromInput,
} from '../../../../lib/engine/input/bridge.js';
import { safeSolveDecisionForUser } from '../../../../lib/engine/solver.js';
import { DEFAULT_ENGINE_RUNTIME } from '../../../../lib/engine/runtime.js';
import type { EngineInput } from '../../../../lib/engine/input/EngineInput.js';
import {
  hashReplayPayload,
  normalizeJson,
  replayIndexFilename,
  replayObjectPath,
  type ReplayPayload,
  type VersionSnapshot,
} from '../../../../scripts/lib/replay-payload.mjs';

const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), '../../../..');
const replayRoot = path.join(repoRoot, 'tests', 'replay');
const indexRoot = path.join(replayRoot, 'index');
const versionSourcePath = path.join(repoRoot, 'lib', 'engine', 'version.ts');

const parseJsonText = globalThis.JSON['parse'] as (value: string) => unknown;
const JsonTextSchema = z.string().transform((value, ctx) => {
  try {
    return parseJsonText(value);
  } catch (error: unknown) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Invalid JSON: ${error instanceof Error ? error.message : String(error)}`,
    });
    return z.NEVER;
  }
});

function parseJson(text: string): unknown {
  const parsed = JsonTextSchema.safeParse(text);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const message = issue?.message ?? parsed.error.message;
    throw Error(message);
  }
  return parsed.data;
}

const VersionsSchema = z
  .object({
    engineBehaviorVersion: z.string(),
    engineInputVersion: z.string(),
    engineCandidateSpaceVersion: z.string(),
    engineAccountingVersion: z.string(),
  })
  .strict();

const EngineInputSchema = z.custom<EngineInput>();

const PayloadSchema = z
  .object({
    input: EngineInputSchema,
    output: z.unknown(),
    meta: z.unknown(),
  })
  .strict();

const MetaSchema = z
  .object({
    traceId: z.string(),
    redactionVersion: z.string(),
    source: z.enum(['api/scan', 'api/simulate', 'autopilot']),
    surface: z.string(),
    timestampMs: z.number().int().optional(),
    user: z.string(),
  })
  .strict();

const IndexSchema = z
  .object({
    versions: VersionsSchema,
    hashes: z.array(z.string()).min(1),
  })
  .strict();

type ReplayIndexPath = {
  path: string;
};

function listIndexFiles(root: string): ReplayIndexPath[] {
  const results: ReplayIndexPath[] = [];
  if (!fs.existsSync(root)) return results;
  const entries = fs.readdirSync(root, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (!entry.name.endsWith('.json')) continue;
    results.push({ path: path.join(root, entry.name) });
  }
  results.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  return results;
}

function objectPathForHash(hash: string): string {
  return replayObjectPath(replayRoot, hash);
}

function extractVersion(content: string, name: string): string | undefined {
  const pattern = new RegExp(`${name}\\s*=\\s*['"]([^'"]+)['"]`);
  const match = content.match(pattern);
  return match?.at(1);
}

function loadVersionSnapshot(): VersionSnapshot {
  const content = fs.readFileSync(versionSourcePath, 'utf8');
  const behavior = extractVersion(content, 'engineBehaviorVersion');
  const input = extractVersion(content, 'engineInputVersion');
  const candidateSpace = extractVersion(content, 'engineCandidateSpaceVersion');
  const accounting = extractVersion(content, 'engineAccountingVersion');
  assert.ok(behavior !== undefined, 'engineBehaviorVersion missing in lib/engine/version.ts');
  assert.ok(input !== undefined, 'engineInputVersion missing in lib/engine/version.ts');
  assert.ok(candidateSpace !== undefined, 'engineCandidateSpaceVersion missing in lib/engine/version.ts');
  assert.ok(accounting !== undefined, 'engineAccountingVersion missing in lib/engine/version.ts');
  return {
    engineBehaviorVersion: behavior,
    engineInputVersion: input,
    engineCandidateSpaceVersion: candidateSpace,
    engineAccountingVersion: accounting,
  };
}

const references = listIndexFiles(indexRoot);
assert.ok(references.length > 0, 'expected at least one replay index file');
const versionSnapshot = loadVersionSnapshot();
const expectedIndexPath = path.join(indexRoot, replayIndexFilename(versionSnapshot));
assert.ok(fs.existsSync(expectedIndexPath), 'missing index for current engine version');

let samplePayload: ReplayPayload | null = null;
let sampleHash: string | null = null;

for (const replay of references) {
  const indexRaw = fs.readFileSync(replay.path, 'utf8');
  const index = IndexSchema.parse(parseJson(indexRaw));
  const indexName = path.basename(replay.path);
  assert.equal(indexName, replayIndexFilename(index.versions), `${replay.path}: index filename mismatch`);

  if (replay.path !== expectedIndexPath) continue;

  const hashes = index.hashes;
  const seenHashes = new Set<string>();
  for (const hash of hashes) {
    assert.ok(seenHashes.has(hash) === false, `${replay.path}: duplicate hash ${hash}`);
    seenHashes.add(hash);
  }

  for (const hash of hashes) {
    const objectPath = objectPathForHash(hash);
    assert.ok(fs.existsSync(objectPath), `${replay.path}: missing replay object ${hash}`);

    const payloadRaw = fs.readFileSync(objectPath, 'utf8');
    const payload = PayloadSchema.parse(parseJson(payloadRaw));
    const input = EngineInputSchema.parse(payload.input);
    const meta = MetaSchema.parse(payload.meta);
    const expectedOutput = payload.output;

    const issues = validateEngineInput(input);
    assert.equal(issues.length, 0, `${replay.path}: EngineInput validation failed: ${JSON.stringify(issues)}`);

    assert.equal(
      index.versions.engineBehaviorVersion,
      versionSnapshot.engineBehaviorVersion,
      `${replay.path}: behavior version mismatch`
    );
    assert.equal(
      index.versions.engineInputVersion,
      versionSnapshot.engineInputVersion,
      `${replay.path}: input version mismatch`
    );
    assert.equal(
      index.versions.engineCandidateSpaceVersion,
      versionSnapshot.engineCandidateSpaceVersion,
      `${replay.path}: candidate space version mismatch`
    );
    assert.equal(
      index.versions.engineAccountingVersion,
      versionSnapshot.engineAccountingVersion,
      `${replay.path}: accounting version mismatch`
    );

    const nowMs = meta.timestampMs !== undefined ? meta.timestampMs : 0;
    const userId = meta.user;

    const solverOptions = buildSolverOptionsFromInput(input);
    const state = buildEngineStateFromInput({ input, userId });
    const ctx = buildEngineContextFromInput({ input, nowMs });

    const solverOverrides = {
      includeLegacyDecision: false,
      runtime: DEFAULT_ENGINE_RUNTIME,
      stateOverride: state,
      ...(solverOptions.weights === null ? {} : { weights: solverOptions.weights }),
      ...(solverOptions.maxCandidates === null ? {} : { maxCandidates: solverOptions.maxCandidates }),
    };
    const result = await safeSolveDecisionForUser(userId, ctx, solverOverrides);
    if (!result.ok) {
      assert.fail(`${replay.path}: replay solve failed: ${result.message}`);
    }
    const output = { decisions: result.decisions, trace: result.trace, state: result.state };

    const payloadHash = hashReplayPayload({ input, output: expectedOutput, meta });
    assert.equal(payloadHash, hash, `${replay.path}: payload hash mismatch`);
    if (samplePayload === null) {
      samplePayload = { input, output: expectedOutput, meta };
      sampleHash = payloadHash;
    }

    const normalizedActual = normalizeJson(output);
    const normalizedExpected = normalizeJson(expectedOutput);
    assert.deepEqual(normalizedActual, normalizedExpected, `${replay.path}: output mismatch`);
  }
}

if (samplePayload !== null && sampleHash !== null) {
  const altVersions: VersionSnapshot = {
    ...versionSnapshot,
    engineBehaviorVersion: `${versionSnapshot.engineBehaviorVersion}-alt`,
  };
  assert.ok(altVersions.engineBehaviorVersion !== versionSnapshot.engineBehaviorVersion);
  assert.equal(
    hashReplayPayload(samplePayload),
    sampleHash,
    'payload hash must not depend on engine versions'
  );
  assert.ok(fs.existsSync(objectPathForHash(sampleHash)), 'payload object must exist');
}

console.warn('engine/replay: ok');
