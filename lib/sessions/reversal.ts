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

  if (verified) return null;
  if (!bucketId) return null;
  if (bucketSpendReversed) return null;
  if (confirmedAmountCents == null || confirmedAmountCents <= 0) return null;
  if (currentBucketSpentCents == null) return null;

  const newSpentCents = Math.max(0, currentBucketSpentCents - confirmedAmountCents);
  return { bucketId, newSpentCents };
}

