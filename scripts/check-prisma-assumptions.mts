import fs from 'node:fs';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import fg from 'fast-glob';
import { ensureTsEsm } from './lib/ensure-ts-esm.mts';
import { asMessage } from './guardrails/lib/error.mts';
import { fail } from './guardrails/lib/fail.mts';

ensureTsEsm();


const prisma = new PrismaClient();
const PREFIX = 'check:prisma-assumptions';
const FIX = 'Align Prisma schema assumptions and regenerate the client.';

function assertOfflineEvaluatorModelsPresent() {
  const hasIncomeRegime = typeof prisma.historicalIncomeRegime?.findFirst === 'function';
  const hasBucketTemplate = typeof prisma.historicalBucketTemplate?.findFirst === 'function';

  if (!hasIncomeRegime || !hasBucketTemplate) {
    throw Error(
      'Prisma client missing offline evaluator models (historicalIncomeRegime/historicalBucketTemplate). Run migrations and `npx prisma generate`.',
    );
  }
}

async function main() {
  const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma');
  if (fs.existsSync(schemaPath)) {
    const schema = fs.readFileSync(schemaPath, 'utf8');
    if (/@default\s*\(\s*uuid\s*\(\s*\)\s*\)/.test(schema)) {
      throw Error('Prisma schema uses @default(uuid()) — derive or inject IDs explicitly for engine-visible models.');
    }
  }

  const sourceFiles = fg.sync(['lib/**/*.ts', 'app/**/*.ts'], { absolute: true, ignore: ['**/node_modules/**'] });
  for (const file of sourceFiles) {
    const content = fs.readFileSync(file, 'utf8');
    if (content.includes('findMany(') && !content.includes('orderBy')) {
      throw Error(`findMany without orderBy detected in ${path.relative(process.cwd(), file)}`);
    }
  }

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
  }).catch((error: unknown) => {
    void asMessage(error);
    return undefined;
  });

  // HistoricalEngineEvaluation joins to BankTransaction
  await prisma.historicalEngineEvaluation.findFirst({
    include: { bankTransaction: true },
  });

  // RunId presence
  await prisma.historicalEngineEvaluation
    .findFirst({
      select: { runId: true, userId: true, bankTransactionId: true },
    })
    .catch((error: unknown) => {
      void asMessage(error);
      return undefined;
    });

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

void (async () => {
  try {
    await main();
  } catch (error: unknown) {
    const message = asMessage(error);
    await prisma.$disconnect();
    fail(PREFIX, `Prisma schema assumption failed: ${message}`, { fix: FIX });
  } finally {
    await prisma.$disconnect();
  }
})();
