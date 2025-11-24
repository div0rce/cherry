/**
 * Seed demo data: one demo user, three cards with reward rules, two buckets.
 * Safe to re-run; it upserts by nickname and resets bucket balances.
 *
 * Run: npm run seed:demo
 */

import { prisma } from '../lib/prisma';
import { RewardCategory, BucketPeriod } from '@prisma/client';

const DEMO_USER_ID = 'demo-user-id';

async function main() {
  const user = await prisma.user.upsert({
    where: { id: DEMO_USER_ID },
    update: {},
    create: {
      id: DEMO_USER_ID,
      email: 'demo@example.com',
      name: 'Demo User',
    },
  });

  // Helper to upsert card + rule
  async function upsertCard(opts: {
    nickname: string;
    issuer: string;
    network: string;
    isCredit: boolean;
    annualFee?: number | null;
    rule: { category: RewardCategory; multiplier?: number | null; cashbackPercent?: number | null };
  }) {
    const existing = await prisma.card.findFirst({
      where: { nickname: opts.nickname, userId: user.id },
    });

    const card = existing
      ? await prisma.card.update({
          where: { id: existing.id },
          data: {
            issuer: opts.issuer,
            network: opts.network,
            isCredit: opts.isCredit,
            annualFee: opts.annualFee ?? null,
          },
        })
      : await prisma.card.create({
          data: {
            userId: user.id,
            nickname: opts.nickname,
            issuer: opts.issuer,
            network: opts.network,
            isCredit: opts.isCredit,
            annualFee: opts.annualFee ?? null,
          },
        });

    // one rule per card/category; delete old then create fresh
    await prisma.rewardRule.deleteMany({ where: { cardId: card.id } });
    await prisma.rewardRule.create({
      data: {
        cardId: card.id,
        category: opts.rule.category,
        multiplier: opts.rule.multiplier ?? null,
        cashbackPercent: opts.rule.cashbackPercent ?? null,
      },
    });

    return card;
  }

  await upsertCard({
    nickname: 'Demo Dining Plus',
    issuer: 'Cherry',
    network: 'VISA',
    isCredit: true,
    annualFee: 0,
    rule: { category: RewardCategory.DINING, multiplier: 4 },
  });

  await upsertCard({
    nickname: 'Demo Groceries',
    issuer: 'Cherry',
    network: 'MASTERCARD',
    isCredit: true,
    annualFee: 0,
    rule: { category: RewardCategory.GROCERIES, multiplier: 3 },
  });

  await upsertCard({
    nickname: 'Demo Flat Cashback',
    issuer: 'Cherry',
    network: 'VISA',
    isCredit: true,
    annualFee: 0,
    rule: { category: RewardCategory.OTHER, cashbackPercent: 2 },
  });

  // Buckets
  async function upsertBucket(opts: {
    name: string;
    period: BucketPeriod;
    budget: number;
    strictMode: boolean;
    category: RewardCategory;
  }) {
    const existing = await prisma.bucket.findFirst({
      where: { name: opts.name, userId: user.id },
    });

    if (existing) {
      return prisma.bucket.update({
        where: { id: existing.id },
        data: {
          period: opts.period,
          budgetAmount: opts.budget,
          currentAmount: opts.budget,
          strictMode: opts.strictMode,
          category: opts.category,
        },
      });
    }

    return prisma.bucket.create({
      data: {
        userId: user.id,
        name: opts.name,
        period: opts.period,
        budgetAmount: opts.budget,
        currentAmount: opts.budget,
        strictMode: opts.strictMode,
        category: opts.category,
      },
    });
  }

  await upsertBucket({
    name: 'Dining Weekly',
    period: BucketPeriod.WEEKLY,
    budget: 10000,
    strictMode: true,
    category: RewardCategory.DINING,
  });

  await upsertBucket({
    name: 'Groceries Monthly',
    period: BucketPeriod.MONTHLY,
    budget: 30000,
    strictMode: false,
    category: RewardCategory.GROCERIES,
  });

  console.log('Seeded demo user, cards, and buckets.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
