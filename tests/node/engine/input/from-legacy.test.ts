import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { engineInputVersion } from '../../../../lib/engine/input/EngineInput.js';
import { fromLegacy, type LegacyEngineAdapterInput } from '../../../../lib/engine/input/fromLegacy.js';
import { validateEngineInput } from '../../../../lib/engine/input/validate.js';
import type { EngineInput } from '../../../../lib/engine/input/EngineInput.js';

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

function parseJsonFixture(text: string): unknown {
  const parsed = JsonTextSchema.safeParse(text);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const message = issue?.message ?? parsed.error.message;
    throw Error(message);
  }
  return parsed.data;
}

const FixtureSchema = z.object({
  engineInputVersion: z.string(),
  legacy: z.custom<LegacyEngineAdapterInput>(),
  expected: z.custom<EngineInput>(),
}).strict();

const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), '../../../..');
const fixturesDir = path.join(repoRoot, 'tests', 'fixtures', 'engine-input');

const fixtures = fs
  .readdirSync(fixturesDir)
  .filter((name) => name.endsWith('.json'))
  .sort();

for (const name of fixtures) {
  const raw = fs.readFileSync(path.join(fixturesDir, name), 'utf8');
  const parsed = FixtureSchema.parse(parseJsonFixture(raw));

  assert.equal(
    parsed.engineInputVersion,
    engineInputVersion,
    `${name}: engineInputVersion mismatch`
  );

  const actual = fromLegacy(parsed.legacy);
  assert.deepEqual(actual, parsed.expected, `${name}: fromLegacy mismatch`);

  const issues = validateEngineInput(actual);
  assert.equal(issues.length, 0, `${name}: validation issues: ${JSON.stringify(issues)}`);
}

console.warn('engine-input/from-legacy: ok');
