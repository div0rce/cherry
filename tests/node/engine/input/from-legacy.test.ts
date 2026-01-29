import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { readJsonFile } from '../../../../scripts/guardrails/lib/read-json.mjs';
import { engineInputVersion } from '../../../../lib/engine/input/EngineInput.js';
import { fromLegacy, type LegacyEngineAdapterInput } from '../../../../lib/engine/input/fromLegacy.js';
import { validateEngineInput } from '../../../../lib/engine/input/validate.js';
import type { EngineInput } from '../../../../lib/engine/input/EngineInput.js';

const FixtureSchema = z.object({
  engineInputVersion: z.string(),
  legacy: z.custom<LegacyEngineAdapterInput>(),
  expected: z.custom<EngineInput>(),
});
type Fixture = z.infer<typeof FixtureSchema>;

const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), '../../../..');
const fixturesDir = path.join(repoRoot, 'tests', 'fixtures', 'engine-input');

const fixtures = fs
  .readdirSync(fixturesDir)
  .filter((name) => name.endsWith('.json'))
  .sort();

for (const name of fixtures) {
  const parsed = FixtureSchema.parse(readJsonFile(path.join(fixturesDir, name)));

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
