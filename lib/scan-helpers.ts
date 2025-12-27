import { RewardCategory } from '@prisma/client';
import { prisma } from './prisma';
import { resolveCategory } from './engine';

function hasNonEmptyString(value?: string | null): value is string {
  return value !== undefined && value !== null && value !== '';
}

export async function inferCategoryForMerchant(
  userId: string,
  merchantName: string
): Promise<RewardCategory> {
  const lastTx = await prisma.simulatedTransaction.findFirst({
    where: { userId, merchantName },
    orderBy: { createdAt: 'desc' },
    select: { resolvedCategory: true },
  });

  if (
    lastTx !== null &&
    lastTx !== undefined &&
    lastTx.resolvedCategory !== null &&
    lastTx.resolvedCategory !== undefined
  ) {
    return lastTx.resolvedCategory;
  }

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

  const hasExplicitCategory =
    explicitCategory !== null && explicitCategory !== undefined && explicitCategory !== '';
  if (hasExplicitCategory) {
    return resolveCategory({
      mccCode,
      category: explicitCategory,
      merchantName,
    });
  }

  const hasMccCode = mccCode !== null && mccCode !== undefined && !Number.isNaN(mccCode);
  if (hasMccCode) {
    return resolveCategory({
      mccCode,
      category: null,
      merchantName,
    });
  }

  if (hasNonEmptyString(merchantName)) {
    const inferred = await inferCategoryForMerchant(params.userId, merchantName);
    if (inferred !== RewardCategory.OTHER) {
      return inferred;
    }
  }

  return resolveCategory({
    mccCode: null,
    category: null,
    merchantName,
  });
}
