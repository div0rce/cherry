export type InvariantMeta = {
  userId?: string | null;
  mode?: string | null;
  environment?: string | null;
  endpoint?: string | null;
  deviceId?: string | null;
  reason?: string | null;
  requestId?: string | null;
  meta?: string | null;
  err?: Error;
};

export function logInvariant(message: string, meta: InvariantMeta): void {
  console.error('[INVARIANT]', message, meta);
}

export function logUnexpectedError(message: string, extra?: unknown): void {
  console.error('[UNEXPECTED_ERROR]', message, extra ?? null);
}
