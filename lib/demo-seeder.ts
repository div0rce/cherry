import { prisma } from './prisma';
import {
  BucketPeriod,
  CategoryBudgetMode,
  CategoryCoverageModeDb,
  CherryPointLedgerStatus,
  LedgerAnomalyCode,
  RecommendationStatus,
  RecommendationVerdict,
  RecommendationSource,
  RewardCategory,
  SessionAnomalyCode,
  VerificationStatus,
} from '@prisma/client';
import type { OverallVerdict } from './enums';
import { runEngine } from './engine';
import { randomUUID } from 'crypto';

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
    name: 'Dining Monthly',
    period: BucketPeriod.MONTHLY,
    budgetAmount: 40_000,
    currentAmount: 25_000,
    spentCents: 15_000,
    strictMode: true,
    category: RewardCategory.DINING,
  },
  {
    name: 'Groceries Monthly',
    period: BucketPeriod.MONTHLY,
    budgetAmount: 30_000,
    currentAmount: 25_000,
    spentCents: 5_000,
    strictMode: false,
    category: RewardCategory.GROCERIES,
  },
] as const;

export type SeedDemoSummary = {
  cards: number;
  buckets: number;
  sessions: number;
  ledgerEntries: number;
};

type SeedCardsBucketsSummary = {
  cards: number;
  buckets: number;
};

async function assertUserExists(userId: string) {
  const existing = await prisma.user.findUnique({ where: { id: userId } });
  if (existing) return existing;
  return prisma.user.create({
    data: {
      id: userId,
      email: `${userId}@dev.cherry.local`,
      name: 'Cherry Demo User',
    },
  });
}

async function upsertDemoCardForUser(userId: string, def: (typeof cardDefinitions)[number]) {
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

async function seedDemoCardsForUser(userId: string): Promise<number> {
  await Promise.all(cardDefinitions.map((card) => upsertDemoCardForUser(userId, card)));
  return cardDefinitions.length;
}

async function seedDemoBucketsForUser(
  userId: string,
  periodStart: Date,
  periodEnd: Date,
): Promise<number> {
  for (const bucket of bucketDefinitions) {
    const existing = await prisma.bucket.findFirst({ where: { userId, name: bucket.name } });
    if (existing) {
      await prisma.bucket.update({
        where: { id: existing.id },
        data: {
          period: bucket.period,
          budgetAmount: bucket.budgetAmount,
          currentAmount: bucket.currentAmount,
          spentCents: bucket.spentCents,
          strictMode: bucket.strictMode,
          category: bucket.category,
          periodStart,
          periodEnd,
        },
      });
    } else {
      await prisma.bucket.create({
        data: {
          userId,
          name: bucket.name,
          period: bucket.period,
          budgetAmount: bucket.budgetAmount,
          currentAmount: bucket.currentAmount,
          spentCents: bucket.spentCents,
          strictMode: bucket.strictMode,
          category: bucket.category,
          periodStart,
          periodEnd,
        },
      });
    }
  }
  return bucketDefinitions.length;
}

async function seedCategoryPreferenceIfMissing(userId: string) {
  const existing = await prisma.categoryPreference.findFirst({
    where: { userId, category: RewardCategory.ENTERTAINMENT },
  });
  if (!existing) {
    await prisma.categoryPreference.create({
      data: {
        userId,
        category: RewardCategory.ENTERTAINMENT,
        mode: CategoryBudgetMode.UNBUDGETED,
      },
    });
  }
}

export async function seedCardsAndBucketsForUser(
  userId: string,
  options?: {
    periodStart?: Date;
    periodEnd?: Date;
    includeCategoryPreference?: boolean;
  },
): Promise<SeedCardsBucketsSummary> {
  await assertUserExists(userId);

  const now = new Date();
  const periodStart = options?.periodStart ?? new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = options?.periodEnd ?? new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const cardsSeeded = await seedDemoCardsForUser(userId);
  const bucketsSeeded = await seedDemoBucketsForUser(userId, periodStart, periodEnd);

  if (options?.includeCategoryPreference) {
    await seedCategoryPreferenceIfMissing(userId);
  }

  return { cards: cardsSeeded, buckets: bucketsSeeded };
}

export async function seedDemoForUser(userId: string): Promise<SeedDemoSummary> {
  await assertUserExists(userId);
  // Clear user data for a clean seed slate
  await prisma.cherryPointLedger.deleteMany({ where: { userId } });
  await prisma.recommendationSession.deleteMany({ where: { userId } });
  await prisma.simulatedTransaction.deleteMany({ where: { userId } });
  await prisma.simulation.deleteMany({ where: { userId } });
  await prisma.bucket.deleteMany({ where: { userId } });
  await prisma.card.deleteMany({ where: { userId } });
  await prisma.categoryPreference.deleteMany({ where: { userId } });

  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const { cards: cardCount, buckets } = await seedCardsAndBucketsForUser(userId, {
    periodStart,
    periodEnd,
    includeCategoryPreference: true,
  });

  const cards = await prisma.card.findMany({ where: { userId } });
  const cardMap = cards.reduce<Record<string, string>>((acc, card) => {
    acc[card.nickname] = card.id;
    return acc;
  }, {});

  // Seed demo sessions via engine + posted ledger rows
  const demoSessions = [
    { merchantName: 'Demo Chipotle', category: RewardCategory.DINING, amountCents: 2_000 },
    { merchantName: 'Demo Overbudget Steakhouse', category: RewardCategory.DINING, amountCents: 9_000 },
    { merchantName: 'Demo Netflix', category: RewardCategory.ENTERTAINMENT, amountCents: 1_599 },
    { merchantName: 'Demo Trader Joe’s', category: RewardCategory.GROCERIES, amountCents: 4_000 },
  ];

  let sessionsCreated = 0;
  let ledgerCreated = 0;
  for (const demo of demoSessions) {
    const decision = await runEngine({
      userId,
      merchantName: demo.merchantName,
      category: demo.category,
      amountCents: demo.amountCents,
    });

    const session = await prisma.recommendationSession.create({
      data: {
        userId,
        merchantName: demo.merchantName,
        category: decision.category,
        amountCents: decision.amountCents,
        currency: 'USD',
        recommendedCardId: decision.card.cardId ?? cardMap['Demo Flat Cashback'] ?? null,
        recommendedBucketId: decision.budget.bucketId ?? null,
        orderToken: randomUUID(),
        source: RecommendationSource.APP_SCAN,
        verdict:
          decision.budget.verdict === 'BREAKS_BUDGET'
            ? RecommendationVerdict.BREAKS_BUDGET
            : decision.budget.verdict === 'BORDERLINE'
              ? RecommendationVerdict.BORDERLINE
              : RecommendationVerdict.HEALTHY,
        budgetVerdict: decision.budget.verdict,
        cardVerdict: decision.card.verdict,
        overallVerdict: decision.overallVerdict as OverallVerdict,
        coverageMode:
          (decision.budget.coverageMode as CategoryCoverageModeDb | undefined) ??
          CategoryCoverageModeDb.UNCONFIGURED,
        status: RecommendationStatus.VERIFIED,
        verificationStatus: VerificationStatus.VERIFIED,
        anomalyCode: SessionAnomalyCode.NONE,
        anomalyDetails: null,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        verifiedAt: new Date(),
        cherryPointsOffered: decision.cherryIncentive.pointsIfFollowed,
      },
    });
    sessionsCreated += 1;

    const points = decision.cherryIncentive.pointsIfFollowed;
    await prisma.cherryPointLedger.create({
      data: {
        userId,
        sessionId: session.id,
        points,
        reason: `Demo: ${demo.merchantName}`,
        status: CherryPointLedgerStatus.POSTED,
        isAnomalous: false,
        anomalyCode: LedgerAnomalyCode.NONE,
        awardedAt: new Date(),
        postedAt: new Date(),
      },
    });
    ledgerCreated += 1;
  }

  return {
    cards: cardCount,
    buckets,
    sessions: sessionsCreated,
    ledgerEntries: ledgerCreated,
  };
}
