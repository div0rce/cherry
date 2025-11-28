import { RewardCategory } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { resolveCategory } from '@/lib/engine';

export async function inferCategoryForMerchant(
  userId: string,
  merchantName: string
): Promise<RewardCategory> {
  const lastTx = await prisma.simulatedTransaction.findFirst({
    where: { userId, merchantName },
    orderBy: { createdAt: 'desc' },
    select: { resolvedCategory: true },
  });

  if (lastTx?.resolvedCategory) return lastTx.resolvedCategory;

  return RewardCategory.OTHER;
}

export async function resolveScanCategory(params: {
  userId: string;
  merchantName?: string | null;
  mccCode?: number | null;
  explicitCategory?: string | RewardCategory | null;
}): Promise<RewardCategory> {
  const merchantName = params.merchantName ?? null;
  const mccCode = params.mccCode ?? null;
  const explicitCategory = params.explicitCategory ?? null;

  if (explicitCategory) {
    return resolveCategory({
      mccCode,
      category: explicitCategory,
      merchantName,
    });
  }

  if (mccCode != null) {
    return resolveCategory({
      mccCode,
      category: null,
      merchantName,
    });
  }

  if (merchantName) {
    const inferred = await inferCategoryForMerchant(params.userId, merchantName);
    if (inferred && inferred !== RewardCategory.OTHER) {
      return inferred;
    }
  }

  return resolveCategory({
    mccCode: null,
    category: null,
    merchantName,
  });
}
