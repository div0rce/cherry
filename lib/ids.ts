import { hasText } from '@/lib/text';
import { isPositiveNumber } from '@/lib/numbers';

export function buildSwipeIdempotencyKey(args: {
  userId: string;
  merchant: string;
  amountCents: number;
  occurredAt: Date;
}): string {
  const { userId, merchant, amountCents, occurredAt } = args;
  const hasValidUser = hasText(userId);
  const hasValidMerchant = hasText(merchant);
  const hasValidAmount = isPositiveNumber(amountCents);
  const hasValidDate = occurredAt instanceof Date && Number.isFinite(occurredAt.getTime());

  if (!hasValidUser || !hasValidMerchant || !hasValidAmount || !hasValidDate) {
    throw new Error('Invalid swipe context for idempotency key');
  }

  return `${userId}:${merchant.trim()}:${amountCents}:${occurredAt.toISOString()}`;
}
