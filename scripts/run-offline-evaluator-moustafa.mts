import { Prisma } from '@prisma/client';

import { prisma } from '../lib/prisma.js';
import { defaultRunIdForUser, evaluateTransactionOffline } from '../lib/evaluator/offline-history.js';
import { LAB_USER_EMAIL, LAB_USER_NAME } from '../lib/user-context.js';
import { getDevIngestUser } from '../lib/dev/dev-user.js';
import { classifyIncomeAndP2PForUser } from '../lib/income/classifier.js';
import { rebuildIncomeRegimesAndBuckets } from '../lib/buckets/regimes.js';
import { RegimeBucketTracker } from '../lib/evaluator/regime-buckets.js';
import { ensureTsEsm } from './lib/ensure-ts-esm.mjs';
import { asMessage } from './guardrails/lib/error.mjs';
import { fail } from './guardrails/lib/fail.mjs';

ensureTsEsm();

const PREFIX = 'run-offline-evaluator-moustafa';
const FIX = 'Run in non-production with valid user data and database access.';

type ClassifiedBankTransaction = import('../lib/income/types.js').ClassifiedBankTransaction;

const hasText = (value?: string | null): value is string =>
  value !== undefined && value !== null && value !== '';

async function resolveDevUser() {
  if (process.env['NODE_ENV'] === 'production') {
    throw Error('Offline evaluator is disabled in production');
  }

  const cliArg = process.argv[2];
  if (hasText(cliArg)) {
    if (cliArg.includes('@')) {
      const existing = await prisma.user.findUnique({ where: { email: cliArg } });
      if (existing !== null) return existing;
      return prisma.user.create({
        data: { email: cliArg, ...(cliArg === LAB_USER_EMAIL ? { name: LAB_USER_NAME } : {}) },
      });
    }
    const user = await prisma.user.findUnique({ where: { id: cliArg } });
    if (user !== null) return user;
    throw Error(`No user found for id "${cliArg}". Provide an email to auto-create.`);
  }

  const resolved = await getDevIngestUser(prisma);
  return prisma.user.findUniqueOrThrow({ where: { id: resolved.id } });
}

function buildRunId(): string {
  const runId = process.env['EVALUATOR_RUN_ID'];
  if (hasText(runId)) return runId;
  return '';
}

async function getCsvDevUsers(): Promise<string[]> {
  const grouped = await prisma.bankTransaction.groupBy({
    by: ['userId'],
    where: { source: 'csv_dev' },
    _count: true,
  });
  return grouped.map((g) => g.userId);
}

async function main() {
  const usersToProcess: string[] = [];

  // Prefer explicit targets first.
  const explicit = await (async () => {
    try {
      const user = await resolveDevUser();
      return user.id;
    } catch (error: unknown) {
      void asMessage(error);
      return null;
    }
  })();

  const csvUsers = await getCsvDevUsers();

  if (hasText(explicit)) {
    usersToProcess.push(explicit);
  }
  for (const u of csvUsers) {
    if (!usersToProcess.includes(u)) usersToProcess.push(u);
  }

  if (usersToProcess.length === 0) {
    console.warn('No users with csv_dev transactions found. Run ingest first.');
    return;
  }

  for (const userId of usersToProcess) {
    await classifyIncomeAndP2PForUser(userId, { persist: true, sourceFilter: ['csv_dev'] });
    const regimes = await rebuildIncomeRegimesAndBuckets(userId);
    if (regimes.length === 0) {
      console.warn(`Skipping offline evaluator for user=${userId}; no income regimes computed`);
      continue;
    }
    const templates = await prisma.historicalBucketTemplate.findMany({
      where: { userId, regimeId: { in: regimes.map((r) => r.id) } },
    });
    const bucketTracker = new RegimeBucketTracker(regimes, templates);
    const txs = await prisma.bankTransaction.findMany({
      where: { userId, source: 'csv_dev' },
      orderBy: { postedAt: 'asc' },
    });

    if (txs.length === 0) continue;

    const runIdFromEnv = buildRunId();
    const runClock = txs[0]?.postedAt ?? txs[0]?.occurredAt ?? new Date(0);
    const runId = hasText(runIdFromEnv) ? runIdFromEnv : defaultRunIdForUser(userId, runClock);
    console.warn(`Running offline evaluator for user=${userId}, ${txs.length} transactions, runId=${runId}`);
    let processed = 0;

    for (const tx of txs) {
      const classifiedTx: ClassifiedBankTransaction = {
        id: tx.id,
        userId: tx.userId,
        amountMinor: tx.amountMinor,
        direction: tx.direction,
        description: tx.description,
        rawDescription: tx.rawDescription,
        merchantName: tx.merchantName,
        merchantCity: tx.merchantCity,
        merchantRegion: tx.merchantRegion,
        merchantCountry: tx.merchantCountry,
        mcc: tx.mcc,
        postedAt: tx.postedAt,
        occurredAt: tx.occurredAt,
        source: tx.source,
        section: tx.section,
        incomeKind: tx.incomeKind as ClassifiedBankTransaction['incomeKind'],
        p2pKind: tx.p2pKind as ClassifiedBankTransaction['p2pKind'],
      };

      const bucketResult = bucketTracker.apply(classifiedTx);
      const evalResult = await evaluateTransactionOffline({ userId, tx });

      await prisma.historicalEngineEvaluation.upsert({
        where: { runId_bankTransactionId: { runId, bankTransactionId: tx.id } },
        update: {
          decisionType: evalResult.decisionType,
          cardId: evalResult.cardId,
          bucketId: evalResult.bucketId,
          regimeId: bucketResult.regimeId,
          bucketKey: bucketResult.bucketKey,
          bucketUsageBeforeBps: bucketResult.usageBeforeBps,
          bucketUsageAfterBps: bucketResult.usageAfterBps,
          rawDecision: (evalResult.rawDecision ?? null) as Prisma.InputJsonValue,
          scores: (evalResult.scores ?? null) as Prisma.InputJsonValue,
        },
        create: {
          userId,
          bankTransactionId: tx.id,
          runId,
          decisionType: evalResult.decisionType,
          cardId: evalResult.cardId,
          bucketId: evalResult.bucketId,
          regimeId: bucketResult.regimeId,
          bucketKey: bucketResult.bucketKey,
          bucketUsageBeforeBps: bucketResult.usageBeforeBps,
          bucketUsageAfterBps: bucketResult.usageAfterBps,
          rawDecision: (evalResult.rawDecision ?? null) as Prisma.InputJsonValue,
          scores: (evalResult.scores ?? null) as Prisma.InputJsonValue,
        },
      });

      processed += 1;
      if (processed % 50 === 0) {
        console.warn(`Processed ${processed}/${txs.length} transactions for user ${userId}...`);
      }
    }

    console.warn(`Offline evaluator complete for user=${userId}, runId=${runId}. Total processed: ${processed}`);
  }
}

main()
  .catch((err: unknown) => {
    const message = asMessage(err);
    fail(PREFIX, `Offline evaluator failed: ${message}`, { fix: FIX });
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
