import { RewardCategory } from '@prisma/client';
import { prisma } from '@/lib/prisma';
export { classifySpendingVerdict, computeCherryIncentive } from '@/lib/engine';

export async function inferCategoryForMerchant(userId: string, merchantName: string) {
  const lastTx = await prisma.simulatedTransaction.findFirst({
    where: { userId, merchantName },
    orderBy: { createdAt: 'desc' },
    select: { resolvedCategory: true },
  });

  if (lastTx?.resolvedCategory) return lastTx.resolvedCategory;

  return RewardCategory.OTHER;
}
