export type ReversalComputationInput = {
  verified: boolean;
  confirmedAmountCents: number | null;
  bucketSpendReversed: boolean | null;
  bucketId: string | null;
  currentBucketSpentCents: number | null;
};

export type ReversalResult = { bucketId: string; newSpentCents: number } | null;

const isNumber = (value: number | null | undefined): value is number =>
  value !== null && value !== undefined && !Number.isNaN(value);

const isPositiveNumber = (value: number | null | undefined): value is number =>
  isNumber(value) && value > 0;

const hasBucketId = (bucketId: string | null): bucketId is string => bucketId !== null && bucketId !== '';

const isReversalBlocked = (input: ReversalComputationInput): boolean =>
  input.verified === true || !hasBucketId(input.bucketId) || input.bucketSpendReversed === true;

export function computeBucketReversal(input: ReversalComputationInput): ReversalResult {
  if (isReversalBlocked(input)) return null;
  const { confirmedAmountCents, bucketId, currentBucketSpentCents } = input;
  if (!isPositiveNumber(confirmedAmountCents)) return null;
  if (!isNumber(currentBucketSpentCents)) return null;

  const newSpentCents = Math.max(0, currentBucketSpentCents - confirmedAmountCents);
  return { bucketId: bucketId as string, newSpentCents };
}
