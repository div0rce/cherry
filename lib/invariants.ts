export function assertUserId(
  userId: string | null | undefined,
  context?: string
): asserts userId is string {
  if (!userId || typeof userId !== 'string') {
    const prefix = context ? `${context}: ` : '';
    throw new Error(`${prefix}Invariant: userId is missing or invalid`);
  }
}
