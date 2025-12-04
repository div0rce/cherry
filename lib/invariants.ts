export function assertUserId(
  userId: string | null | undefined,
  context?: string
): asserts userId is string {
  if (
    userId === null ||
    userId === undefined ||
    typeof userId !== 'string' ||
    userId === ''
  ) {
    const prefix = context !== undefined && context !== null && context !== '' ? `${context}: ` : '';
    throw new Error(`${prefix}Invariant: userId is missing or invalid`);
  }
}
