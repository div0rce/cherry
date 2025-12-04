import type { Prisma } from '@prisma/client';

export const BANK_TX_DEFAULT_ORDER: Prisma.BankTransactionOrderByWithRelationInput = {
  postedAt: 'desc',
};

export const BANK_TX_TIMELINE_FIELD: keyof Prisma.BankTransactionOrderByWithRelationInput =
  'postedAt';
