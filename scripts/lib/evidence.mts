import * as fs from 'node:fs';
import * as path from 'node:path';
import { z } from 'zod';
import { readJsonFile } from '../guardrails/lib/read-json.mjs';

export const EVIDENCE_PATH = path.join(process.cwd(), '.evidence', 'latest.json');

const EvidenceChecksSchema = z
  .object({
    command: z.string().min(1),
    exitCode: z.number().int(),
    tail: z.array(z.string()),
  })
  .strict();

const EvidenceStorageSchema = z
  .object({
    tmpRoot: z.string().min(1),
    tmpBytes: z.number().int().nonnegative(),
  })
  .strict();

export const EvidenceSchema = z
  .object({
    pwd: z.string().min(1),
    repoRoot: z.string().min(1),
    head: z.string().min(1),
    clean: z.boolean(),
    log: z.array(z.string()),
    files: z.array(z.string()),
    checks: EvidenceChecksSchema,
    storage: EvidenceStorageSchema,
    timestamp: z.string().min(1),
  })
  .strict();

export type Evidence = z.infer<typeof EvidenceSchema>;

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

export function writeEvidence(evidence: Evidence): void {
  const parsed = EvidenceSchema.safeParse(evidence);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => issue.message).join('; ');
    throw Error(`Invalid evidence: ${issues}`);
  }
  const normalized = normalizeJson(parsed.data);
  const output = `${JSON.stringify(normalized, null, 2)}\n`;
  fs.mkdirSync(path.dirname(EVIDENCE_PATH), { recursive: true });
  fs.writeFileSync(EVIDENCE_PATH, output, 'utf8');
}

export function readEvidence(): Evidence {
  if (!fs.existsSync(EVIDENCE_PATH)) {
    throw Error('Evidence file missing');
  }
  const parsed = EvidenceSchema.safeParse(readJsonFile(EVIDENCE_PATH));
  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => issue.message).join('; ');
    throw Error(`Invalid evidence: ${issues}`);
  }
  return parsed.data;
}
