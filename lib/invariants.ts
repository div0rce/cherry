export function assertUserId(userId: string | null | undefined): asserts userId is string {
  if (!userId || typeof userId !== 'string') {
    throw new Error('Invariant: userId is missing or invalid');
  }
}
