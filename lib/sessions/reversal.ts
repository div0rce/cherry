export type ReversalComputationInput = {
  verified: boolean;
  confirmedAmountCents: number | null;
  bucketSpendReversed: boolean | null;
  bucketId: string | null;
  currentBucketSpentCents: number | null;
};

export type ReversalResult = { bucketId: string; newSpentCents: number } | null;

export function computeBucketReversal(input: ReversalComputationInput): ReversalResult {
  const {
    verified,
    confirmedAmountCents,
    bucketSpendReversed,
    bucketId,
    currentBucketSpentCents,
  } = input;

  if (verified === true) return null;
  if (bucketId === null || bucketId === '') return null;
  if (bucketSpendReversed === true) return null;
  if (
    confirmedAmountCents === null ||
    confirmedAmountCents === undefined ||
    Number.isNaN(confirmedAmountCents) ||
    confirmedAmountCents <= 0
  ) {
    return null;
  }
  if (
    currentBucketSpentCents === null ||
    currentBucketSpentCents === undefined ||
    Number.isNaN(currentBucketSpentCents)
  ) {
    return null;
  }

  const newSpentCents = Math.max(0, currentBucketSpentCents - confirmedAmountCents);
  return { bucketId, newSpentCents };
}
