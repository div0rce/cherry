/**
 * Seed demo data (three cards + reward rules, two buckets) for an existing user.
 *
 * Usage:
 *   npm run seed:demo                 # seeds the first user found
 *   SEED_USER_EMAIL=you@example.com npm run seed:demo
 *   SEED_USER_ID=clt123 npm run seed:demo
 *   npm run seed:demo you@example.com  # CLI arg takes precedence
 */

import { prisma } from '../lib/prisma';
import type {
  RewardCategory as RewardCategoryEnum,
  BucketPeriod as BucketPeriodEnum,
} from '@prisma/client';
import {
  RewardCategory as RewardCategoryValue,
  BucketPeriod as BucketPeriodValue,
} from '@prisma/client';
import { logError, logInfo } from '../lib/logger';

async function resolveTargetUser() {
  const cliArg = process.argv[2];
  const envEmail = process.env.SEED_USER_EMAIL;
  const envUserId = process.env.SEED_USER_ID;

  const findByEmail = (email: string) =>
    prisma.user.findUnique({ where: { email } });
  const findById = (id: string) => prisma.user.findUnique({ where: { id } });

  if (cliArg) {
    const selectorLabel = cliArg.includes('@') ? `email "${cliArg}"` : `id "${cliArg}"`;
    const user = cliArg.includes('@') ? await findByEmail(cliArg) : await findById(cliArg);
    if (!user) {
      throw new Error(
        `No user found for ${selectorLabel}. Sign in through the app, then rerun the seed command with a valid account.`
      );
    }
    return user;
  }

  if (envEmail) {
    const user = await findByEmail(envEmail);
    if (!user) {
      throw new Error(
        `SEED_USER_EMAIL is set to "${envEmail}", but no matching user exists. Sign in first, then rerun the seed command.`
      );
    }
    return user;
  }

  if (envUserId) {
    const user = await findById(envUserId);
    if (!user) {
      throw new Error(
        `SEED_USER_ID is set to "${envUserId}", but no matching user exists. Sign in first, then rerun the seed command.`
      );
    }
    return user;
  }

  const fallbackUser = await prisma.user.findFirst();
  if (!fallbackUser) {
    throw new Error(
      'No users found. Sign in through the app once, then rerun `npm run seed:demo` (optionally set SEED_USER_EMAIL).'
    );
  }
  return fallbackUser;
}

async function main() {
  const user = await resolveTargetUser();

  // Helper to upsert card + rule
  async function upsertCard(opts: {
    nickname: string;
    issuer: string;
    network: string;
    isCredit: boolean;
    annualFee?: number | null;
    rule: {
      category: RewardCategoryEnum;
      multiplier?: number | null;
      cashbackPercent?: number | null;
    };
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
    rule: { category: RewardCategoryValue.DINING, multiplier: 4 },
  });

  await upsertCard({
    nickname: 'Demo Groceries',
    issuer: 'Cherry',
    network: 'MASTERCARD',
    isCredit: true,
    annualFee: 0,
    rule: { category: RewardCategoryValue.GROCERIES, multiplier: 3 },
  });

  await upsertCard({
    nickname: 'Demo Flat Cashback',
    issuer: 'Cherry',
    network: 'VISA',
    isCredit: true,
    annualFee: 0,
    rule: { category: RewardCategoryValue.OTHER, cashbackPercent: 2 },
  });

  // Buckets
  async function upsertBucket(opts: {
    name: string;
    period: BucketPeriodEnum;
    budget: number;
    strictMode: boolean;
    category: RewardCategoryEnum;
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
    period: BucketPeriodValue.WEEKLY,
    budget: 10000,
    strictMode: true,
    category: RewardCategoryValue.DINING,
  });

  await upsertBucket({
    name: 'Groceries Monthly',
    period: BucketPeriodValue.MONTHLY,
    budget: 30000,
    strictMode: false,
    category: RewardCategoryValue.GROCERIES,
  });

  logInfo(`Seeded demo data for user ${user.email ?? user.id}.`);
}

main()
  .catch((err) => {
    logError('Demo seed failed', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
