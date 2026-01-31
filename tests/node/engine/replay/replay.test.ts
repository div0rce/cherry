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

const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), '../../../..');
const replayRoot = path.join(repoRoot, 'tests', 'replay');
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

const VersionsSchema = z.object({
  engineBehaviorVersion: z.string(),
  engineInputVersion: z.string(),
  engineCandidateSpaceVersion: z.string(),
  engineAccountingVersion: z.string(),
}).strict();

const EngineInputSchema = z.custom<EngineInput>();

const MetaSchema = z
  .object({
    traceId: z.string(),
    source: z.enum(['api/scan', 'api/simulate', 'autopilot']),
    surface: z.string(),
    timestampMs: z.number().int().optional(),
    user: z.string(),
  })
  .strict();

type VersionSnapshot = {
  engineBehaviorVersion: string;
  engineInputVersion: string;
  engineCandidateSpaceVersion: string;
  engineAccountingVersion: string;
};

type ReplayPaths = {
  dir: string;
  inputPath: string;
  versionsPath: string;
  outputPath: string;
  metaPath: string;
};

function listReplayInputs(root: string): ReplayPaths[] {
  const results: ReplayPaths[] = [];
  const stack = [root];
  while (stack.length > 0) {
    const current = stack.pop();
    if (current === undefined) continue;
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
        continue;
      }
      if (entry.isFile() && entry.name === 'input.json') {
        const dir = path.dirname(fullPath);
        results.push({
          dir,
          inputPath: fullPath,
          versionsPath: path.join(dir, 'versions.json'),
          outputPath: path.join(dir, 'output.json'),
          metaPath: path.join(dir, 'meta.json'),
        });
      }
    }
  }
  return results;
}

function isEmptyFile(filePath: string): boolean {
  if (!fs.existsSync(filePath)) return true;
  return fs.statSync(filePath).size === 0;
}

function normalizeJson(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => normalizeJson(entry));
  }
  if (value !== null && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record).sort();
    const normalized: Record<string, unknown> = {};
    for (const key of keys) {
      normalized[key] = normalizeJson(record[key]);
    }
    return normalized;
  }
  return value;
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

const inputs = listReplayInputs(replayRoot);
assert.ok(inputs.length > 0, 'expected at least one replay input.json');
const versionSnapshot = loadVersionSnapshot();

for (const replay of inputs) {
  const inputEmpty = isEmptyFile(replay.inputPath);
  const versionsEmpty = isEmptyFile(replay.versionsPath);
  const outputEmpty = isEmptyFile(replay.outputPath);
  const metaEmpty = isEmptyFile(replay.metaPath);

  if (inputEmpty) {
    assert.ok(versionsEmpty, `${replay.dir}: versions.json must be empty when input.json is empty`);
    assert.ok(outputEmpty, `${replay.dir}: output.json must be empty when input.json is empty`);
    assert.ok(metaEmpty, `${replay.dir}: meta.json must be empty when input.json is empty`);
    continue;
  }

  const inputRaw = fs.readFileSync(replay.inputPath, 'utf8');
  const input = EngineInputSchema.parse(parseJson(inputRaw));
  const issues = validateEngineInput(input);
  assert.equal(issues.length, 0, `${replay.dir}: EngineInput validation failed: ${JSON.stringify(issues)}`);

  const versionsRaw = fs.readFileSync(replay.versionsPath, 'utf8');
  const versions = VersionsSchema.parse(parseJson(versionsRaw));
  assert.equal(
    versions.engineBehaviorVersion,
    versionSnapshot.engineBehaviorVersion,
    `${replay.dir}: behavior version mismatch`
  );
  assert.equal(
    versions.engineInputVersion,
    versionSnapshot.engineInputVersion,
    `${replay.dir}: input version mismatch`
  );
  assert.equal(
    versions.engineCandidateSpaceVersion,
    versionSnapshot.engineCandidateSpaceVersion,
    `${replay.dir}: candidate space version mismatch`
  );
  assert.equal(
    versions.engineAccountingVersion,
    versionSnapshot.engineAccountingVersion,
    `${replay.dir}: accounting version mismatch`
  );

  const metaRaw = fs.readFileSync(replay.metaPath, 'utf8');
  const meta = MetaSchema.parse(parseJson(metaRaw));
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
  assert.ok(result.ok, `${replay.dir}: replay solve failed: ${result.message}`);
  const output = { decisions: result.decisions, trace: result.trace, state: result.state };

  const outputRaw = fs.readFileSync(replay.outputPath, 'utf8');
  const expectedOutput = parseJson(outputRaw);

  const normalizedActual = normalizeJson(output);
  const normalizedExpected = normalizeJson(expectedOutput);
  assert.deepEqual(normalizedActual, normalizedExpected, `${replay.dir}: output mismatch`);
}

console.warn('engine/replay: ok');
