import type { Bucket } from '@prisma/client';

export type BucketBalance = {
  limitCents: number;
  postedSpendCents: number;
  pendingSpendCents: number;
  committedCents: number;
  remainingCents: number;
};

export type BucketRuntime = Bucket & BucketBalance;

function clampCents(value: number | null | undefined): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return 0;
  return value < 0 ? 0 : Math.floor(value);
}

export function computeBucketBalanceFromNumbers(
  limitCentsInput: number | null | undefined,
  postedSpendCentsInput: number | null | undefined,
  pendingSpendCentsInput: number | null | undefined = 0
): BucketBalance {
  const limitCents = clampCents(limitCentsInput);
  const postedSpendCents = clampCents(postedSpendCentsInput);
  const pendingSpendCents = clampCents(pendingSpendCentsInput);
  const committedCents = postedSpendCents + pendingSpendCents;
  const remainingCents = Math.max(0, limitCents - committedCents);

  return {
    limitCents,
    postedSpendCents,
    pendingSpendCents,
    committedCents,
    remainingCents,
  };
}

export function computeBucketBalance(bucket: Bucket): BucketBalance {
  const pendingSpendCents = (bucket as { pendingSpendCents?: number }).pendingSpendCents ?? 0;
  return computeBucketBalanceFromNumbers(bucket.budgetAmount, bucket.spentCents, pendingSpendCents);
}

export function toBucketRuntime(bucket: Bucket): BucketRuntime {
  const balance = computeBucketBalance(bucket);
  return { ...bucket, ...balance };
}

export function deriveLegacyCurrentAmount(balance: BucketBalance): number {
  return balance.remainingCents;
}
