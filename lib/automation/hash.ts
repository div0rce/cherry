import { createHash } from 'node:crypto';

export function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => canonicalize(entry));
  }

  if (value !== null && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const output: Record<string, unknown> = {};
    const keys = Object.keys(record).sort((a, b) => a.localeCompare(b));
    for (const key of keys) {
      const entry = record[key];
      if (entry !== undefined) {
        output[key] = canonicalize(entry);
      }
    }
    return output;
  }

  return value;
}

export function canonicalJson(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

export function hashAutomationOutput(value: unknown): string {
  return createHash('sha256').update(canonicalJson(value)).digest('hex');
}

export function buildAutomationIdempotencyKey(parts: readonly string[]): string {
  return hashAutomationOutput(parts);
}
