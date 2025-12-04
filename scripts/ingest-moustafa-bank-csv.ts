import crypto from 'node:crypto';
import path from 'node:path';
import { parseCsvDevFile, type CsvDevTransaction } from '../lib/bank/csv-dev-provider';
import { upsertBankTransactions, type NormalizedBankTransactionInput } from '../lib/bank/ingest';
import { prisma } from '../lib/prisma';
import { LAB_USER_EMAIL, LAB_USER_NAME } from '../lib/user-context';
import { getDevIngestUser } from '../lib/dev/dev-user';

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
