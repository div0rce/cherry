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

function isPrimitive(value: unknown): value is string | number | boolean {
  const kind = typeof value;
  return kind === 'string' || kind === 'number' || kind === 'boolean';
}

function isSerializableEntry([, v]: [string, unknown]): boolean {
  return v !== undefined && typeof v !== 'function';
}

function compareKeys(a: string, b: string): number {
  if (a < b) return -1;
  return a > b ? 1 : 0;
}

function normalizeObject(value: Record<string, unknown>): Record<string, unknown> {
  const sorted = Object.entries(value)
    .filter(isSerializableEntry)
    .map(([k, v]) => [k, normalize(v as Canonicalizable)] as const)
    .sort(([a], [b]) => compareKeys(a, b));
  const result: Record<string, unknown> = {};
  for (const [k, v] of sorted) {
    result[k] = v;
  }
  return result;
}

function normalize(value: Canonicalizable): unknown {
  if (value === null || isPrimitive(value)) return value;
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (Array.isArray(value)) {
    return value.map((item) => normalize(item as Canonicalizable));
  }
  if (isPlainObject(value)) {
    return normalizeObject(value);
  }

  throw new Error('canonicalJson: unsupported value type');
}

export function canonicalJson(value: unknown): string {
  const normalized = normalize(value as Canonicalizable);
  return JSON.stringify(normalized);
}
