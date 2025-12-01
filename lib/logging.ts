export function logInvariant(message: string, extra?: unknown): void {
  console.error('[INVARIANT]', message, extra ?? null);
}

export function logUnexpectedError(message: string, extra?: unknown): void {
  console.error('[UNEXPECTED_ERROR]', message, extra ?? null);
}
