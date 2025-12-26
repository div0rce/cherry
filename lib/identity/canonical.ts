type Canonicalizable =
  | string
  | number
  | boolean
  | null
  | Record<string, unknown>
  | unknown[]
  | Date;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date);
}

function normalize(value: Canonicalizable): unknown {
  if (value === null) return null;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (Array.isArray(value)) {
    return value.map((item) => normalize(item as Canonicalizable));
  }
  if (isPlainObject(value)) {
    const entries = Object.entries(value).filter(([, v]) => v !== undefined && typeof v !== 'function');
    const sorted = entries
      .map(([k, v]) => [k, normalize(v as Canonicalizable)] as const)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    const result: Record<string, unknown> = {};
    for (const [k, v] of sorted) {
      result[k] = v;
    }
    return result;
  }

  throw new Error('canonicalJson: unsupported value type');
}

export function canonicalJson(value: unknown): string {
  const normalized = normalize(value as Canonicalizable);
  return JSON.stringify(normalized);
}
