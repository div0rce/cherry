import { createHash } from 'node:crypto';

export type ReplayPayload = {
  input: unknown;
  output: unknown;
  meta: unknown;
};

export function normalizeJson(value: unknown): unknown {
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

export function hashReplayPayload(payload: ReplayPayload): string {
  const normalized = normalizeJson(payload);
  const json = JSON.stringify(normalized);
  return createHash('sha256').update(json).digest('hex');
}
