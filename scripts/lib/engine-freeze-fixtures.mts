import * as path from 'node:path';
import { z } from 'zod';
import { fail } from '../guardrails/lib/fail.mjs';
import { readJsonFile } from '../guardrails/lib/read-json.mjs';

export const REQUIRED_ENGINE_BEHAVIOR_V4_CASE_IDS = [
  'source-unavailable',
  'source-empty',
  'cancelled-only',
  'present-effective-before-now',
  'present-effective-at-now',
  'future-only',
  'present-plus-future',
  'missing-debt',
  'future-candidate-paydown-excluded',
  'future-only-credit-degradation-stable',
] as const;

const EngineFreezeFixtureSchema = z
  .object({
    fixtureVersion: z.string().min(1),
    note: z.string().optional(),
    fixtures: z.array(
      z
        .object({
          id: z.string().min(1),
          note: z.string().optional(),
        })
        .passthrough()
    ),
  })
  .passthrough();

function collectForbiddenNotes(value: unknown, objectPath: string[] = []): string[] {
  if (value === null || typeof value !== 'object') return [];
  const issues: string[] = [];
  for (const [key, child] of Object.entries(value)) {
    const childPath = [...objectPath, key];
    if (key === 'note' && typeof child === 'string') {
      const normalized = child.toLowerCase();
      if (
        normalized.includes('placeholder') ||
        normalized.includes('todo') ||
        normalized.includes('replace later')
      ) {
        issues.push(`${childPath.join('.')}: note contains placeholder/TODO language`);
      }
    }
    issues.push(...collectForbiddenNotes(child, childPath));
  }
  return issues;
}

export function assertEngineFreezeFixtureSemantics(params: {
  root: string;
  fixturePath: string;
  prefix: string;
  fix: string;
}): void {
  const absolutePath = path.join(params.root, params.fixturePath);
  let raw: unknown;
  try {
    raw = readJsonFile(absolutePath);
  } catch (error: unknown) {
    fail(params.prefix, `Invalid engine fixture JSON: ${params.fixturePath}`, {
      details: [error instanceof Error ? error.message : String(error)],
      fix: params.fix,
    });
  }

  const parsed = EngineFreezeFixtureSchema.safeParse(raw);
  if (!parsed.success) {
    const [firstIssue] = parsed.error.issues;
    fail(params.prefix, `Invalid engine fixture shape: ${params.fixturePath}`, {
      details: [firstIssue?.message ?? parsed.error.message],
      fix: params.fix,
    });
  }

  const fixture = parsed.data;
  const forbiddenNotes = collectForbiddenNotes(raw);
  if (forbiddenNotes.length > 0) {
    fail(params.prefix, `Engine fixture contains placeholder note language: ${params.fixturePath}`, {
      details: forbiddenNotes,
      fix: params.fix,
    });
  }

  if (fixture.fixtureVersion !== 'engine_behavior_v4') return;

  if (fixture.fixtures.length === 0) {
    fail(params.prefix, 'engine_behavior_v4 fixtures must not be empty', {
      details: [`fixture=${params.fixturePath}`],
      fix: params.fix,
    });
  }

  const ids = fixture.fixtures.map((entry) => entry.id);
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
  if (duplicates.length > 0) {
    fail(params.prefix, 'engine_behavior_v4 fixtures contain duplicate case ids', {
      details: [...new Set(duplicates)].map((id) => `duplicate=${id}`),
      fix: params.fix,
    });
  }

  const idSet = new Set(ids);
  const missing = REQUIRED_ENGINE_BEHAVIOR_V4_CASE_IDS.filter((id) => !idSet.has(id));
  if (missing.length > 0) {
    fail(params.prefix, 'engine_behavior_v4 fixtures are missing required case ids', {
      details: missing.map((id) => `missing=${id}`),
      fix: params.fix,
    });
  }
}
