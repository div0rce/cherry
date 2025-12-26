export function asError(err: unknown): asserts err is Error {
  if (!(err instanceof Error)) {
    throw new Error(String(err));
  }
}

export function asLogMeta(value: unknown): string | null {
  return value == null ? null : String(value);
}
