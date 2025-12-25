import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import path from 'node:path';

const requireFn = createRequire(import.meta.url);
requireFn('ts-node/register/transpile-only');

const { parseCsvDevFile } = requireFn('../lib/bank/csv-dev-provider.ts') as typeof import('../lib/bank/csv-dev-provider.ts');
const { upsertBankTransactions } = requireFn('../lib/bank/ingest.ts') as typeof import('../lib/bank/ingest.ts');
const { prisma } = requireFn('../lib/prisma.ts') as typeof import('../lib/prisma.ts');
const { LAB_USER_EMAIL, LAB_USER_NAME } = requireFn('../lib/user-context.ts') as typeof import('../lib/user-context.ts');
const { getDevIngestUser } = requireFn('../lib/dev/dev-user.ts') as typeof import('../lib/dev/dev-user.ts');

type CsvDevTransaction = import('../lib/bank/csv-dev-provider.ts').CsvDevTransaction;
type NormalizedBankTransactionInput = import('../lib/bank/ingest.ts').NormalizedBankTransactionInput;

const hasText = (value?: string | null): value is string =>
  value !== undefined && value !== null && value !== '';

async function resolveDevUser() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Dev CSV ingest is disabled in production environments');
  }

  const cliArg = process.argv[2];
  if (hasText(cliArg)) {
    if (cliArg.includes('@')) {
      const existing = await prisma.user.findUnique({ where: { email: cliArg } });
      if (existing) return existing;
      return prisma.user.create({
        data: { email: cliArg, ...(cliArg === LAB_USER_EMAIL ? { name: LAB_USER_NAME } : {}) },
      });
    }
    const byId = await prisma.user.findUnique({ where: { id: cliArg } });
    if (!byId) throw new Error(`No user found for id "${cliArg}". Provide an email to auto-create.`);
    return byId;
  }

  const resolved = await getDevIngestUser(prisma);
  return prisma.user.findUniqueOrThrow({ where: { id: resolved.id } });
}

function hashExternalId(tx: CsvDevTransaction): string {
  const postedDateLabel = Number.isNaN(tx.postedDate.getTime())
    ? 'invalid'
    : tx.postedDate.toISOString().slice(0, 10);
  const base = [
    postedDateLabel,
    tx.amountMinor,
    tx.rawDescription,
    tx.sourceStatement ?? '',
  ].join('|');
  return crypto.createHash('sha256').update(base).digest('hex');
}

function toNormalized(
  userId: string,
  tx: CsvDevTransaction,
): NormalizedBankTransactionInput {
  return {
    userId,
    externalId: hashExternalId(tx),
    postedAt: tx.postedDate,
    description: tx.description,
    rawDescription: tx.rawDescription,
    amountMinor: tx.amountMinor,
    direction: tx.direction,
    accountLast4: tx.accountLast4,
    source: 'csv_dev',
    sourceStatement: tx.sourceStatement,
    statementStart: tx.statementStart,
    statementEnd: tx.statementEnd,
    section: tx.section,
  };
}

async function main() {
  const csvPath = path.join(process.cwd(), 'data', 'bank', 'moustafa-adv-safebalance-2061.csv');
  const user = await resolveDevUser();
  const csvTxs = await parseCsvDevFile(csvPath);

  const normalized = csvTxs.map((tx) => toNormalized(user.id, tx));
  const result = await upsertBankTransactions(normalized);

  // eslint-disable-next-line no-console
  console.log('Ingest result:', result);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
