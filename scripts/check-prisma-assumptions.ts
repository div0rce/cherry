import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function assertOfflineEvaluatorModelsPresent() {
  const client = prisma as unknown as Record<string, unknown>;
  const hasIncomeRegime =
    Boolean(client['historicalIncomeRegime']) &&
    typeof (client['historicalIncomeRegime'] as Record<string, unknown>)['findFirst'] === 'function';
  const hasBucketTemplate =
    Boolean(client['historicalBucketTemplate']) &&
    typeof (client['historicalBucketTemplate'] as Record<string, unknown>)['findFirst'] === 'function';

  if (!hasIncomeRegime || !hasBucketTemplate) {
    throw new Error(
      'Prisma client missing offline evaluator models (historicalIncomeRegime/historicalBucketTemplate). Run migrations and `npx prisma generate`.',
    );
  }
}

async function main() {
  assertOfflineEvaluatorModelsPresent();
  // BankTransaction timeline + required fields + composite unique
  await prisma.bankTransaction.findFirst({
    orderBy: { postedAt: 'desc' },
    select: { id: true, postedAt: true, amountMinor: true, source: true, externalId: true },
  });

  await prisma.bankTransaction.findUnique({
    where: {
      userId_externalId: {
        userId: 'dummy-user',
        externalId: 'dummy-external',
      },
    },
  }).catch(() => undefined);

  // HistoricalEngineEvaluation joins to BankTransaction
  await prisma.historicalEngineEvaluation.findFirst({
    include: { bankTransaction: true },
  });

  // RunId presence
  await prisma.historicalEngineEvaluation
    .findFirst({
      select: { runId: true, userId: true, bankTransactionId: true },
    })
    .catch(() => undefined);

  await prisma.bankTransaction.findFirst({
    select: { incomeKind: true, p2pKind: true },
  });

  await prisma.historicalIncomeRegime.findFirst({
    select: { id: true, startMonth: true, endMonth: true, avgNetIncomeCents: true },
  });

  await prisma.historicalBucketTemplate.findFirst({
    select: { id: true, bucketKey: true, monthlyLimitCents: true },
  });
}

main()
  .catch(async (err) => {
    console.error('Prisma schema assumption failed:', err);
    await prisma.$disconnect();
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
