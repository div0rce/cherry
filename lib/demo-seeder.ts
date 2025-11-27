import { prisma } from '@/lib/prisma';
import { BucketPeriod, RewardCategory } from '@prisma/client';

const cardDefinitions = [
  {
    nickname: 'Demo Dining Plus',
    issuer: 'Cherry',
    network: 'VISA',
    isCredit: true,
    annualFee: 0,
    rule: { category: RewardCategory.DINING, multiplier: 4 },
  },
  {
    nickname: 'Demo Groceries',
    issuer: 'Cherry',
    network: 'MASTERCARD',
    isCredit: true,
    annualFee: 0,
    rule: { category: RewardCategory.GROCERIES, multiplier: 3 },
  },
  {
    nickname: 'Demo Flat Cashback',
    issuer: 'Cherry',
    network: 'VISA',
    isCredit: true,
    annualFee: 0,
    rule: { category: RewardCategory.OTHER, cashbackPercent: 2 },
  },
] as const satisfies ReadonlyArray<{
  nickname: string;
  issuer: string;
  network: string;
  isCredit: boolean;
  annualFee: number;
  rule:
    | { category: RewardCategory; multiplier: number; cashbackPercent?: null }
    | { category: RewardCategory; multiplier?: null; cashbackPercent: number };
}>;

const bucketDefinitions = [
  {
    name: 'Dining Weekly',
    period: BucketPeriod.WEEKLY,
    budget: 10_000,
    strictMode: true,
    category: RewardCategory.DINING,
  },
  {
    name: 'Groceries Monthly',
    period: BucketPeriod.MONTHLY,
    budget: 30_000,
    strictMode: false,
    category: RewardCategory.GROCERIES,
  },
] as const;

export type SeedDemoSummary = {
  cards: number;
  buckets: number;
};

async function assertUserExists(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new Error(
      `Cannot seed demo data: user ${userId} does not exist. Sign in or create the user first (e.g., via dev-login).`
    );
  }
}

export async function seedDemoForUser(userId: string): Promise<SeedDemoSummary> {
  await assertUserExists(userId);
  async function upsertCard(def: (typeof cardDefinitions)[number]) {
    const existing = await prisma.card.findFirst({
      where: { userId, nickname: def.nickname },
    });

    const card = existing
      ? await prisma.card.update({
          where: { id: existing.id },
          data: {
            issuer: def.issuer,
            network: def.network,
            isCredit: def.isCredit,
            annualFee: def.annualFee ?? null,
          },
        })
      : await prisma.card.create({
          data: {
            userId,
            nickname: def.nickname,
            issuer: def.issuer,
            network: def.network,
            isCredit: def.isCredit,
            annualFee: def.annualFee ?? null,
          },
        });

    await prisma.rewardRule.deleteMany({ where: { cardId: card.id } });
    await prisma.rewardRule.create({
      data: {
        cardId: card.id,
        category: def.rule.category,
        multiplier:
          'multiplier' in def.rule && typeof def.rule.multiplier === 'number'
            ? def.rule.multiplier
            : null,
        cashbackPercent:
          'cashbackPercent' in def.rule && typeof def.rule.cashbackPercent === 'number'
            ? def.rule.cashbackPercent
            : null,
      },
    });
  }

  async function upsertBucket(def: (typeof bucketDefinitions)[number]) {
    const existing = await prisma.bucket.findFirst({
      where: { userId, name: def.name },
    });

    if (existing) {
      await prisma.bucket.update({
        where: { id: existing.id },
        data: {
          period: def.period,
          budgetAmount: def.budget,
          currentAmount: def.budget,
          strictMode: def.strictMode,
          category: def.category,
        },
      });
      return;
    }

    await prisma.bucket.create({
      data: {
        userId,
        name: def.name,
        period: def.period,
        budgetAmount: def.budget,
        currentAmount: def.budget,
        strictMode: def.strictMode,
        category: def.category,
      },
    });
  }

  await Promise.all(cardDefinitions.map((card) => upsertCard(card)));
  await Promise.all(bucketDefinitions.map((bucket) => upsertBucket(bucket)));

  return {
    cards: cardDefinitions.length,
    buckets: bucketDefinitions.length,
  };
}
