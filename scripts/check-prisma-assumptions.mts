import fs from 'node:fs';
import path from 'node:path';
import fg from 'fast-glob';
import { ensureTsEsm } from './lib/ensure-ts-esm.mts';
import { asMessage } from './guardrails/lib/error.mts';
import { fail } from './guardrails/lib/fail.mts';

ensureTsEsm();


const PREFIX = 'check:prisma-assumptions';
const FIX = 'Align Prisma schema assumptions and regenerate the client.';

type ModelBlock = {
  name: string;
  body: string;
};

function assertNoRuntimeDbAccess(): void {
  const isCi = process.env['CI'] === 'true' || process.env['VERCEL'] === '1';
  const databaseUrl = process.env['DATABASE_URL'] ?? '';
  if (isCi && databaseUrl.includes('localhost')) {
    fail(
      'PRISMA_ASSUMPTION_ENV_VIOLATION',
      'check:prisma-assumptions attempted to access a live database in CI',
      {
        fix: 'Rewrite guardrail to be schema-only. Runtime DB access is forbidden.',
      },
    );
  }
}

function loadSchema(schemaPath: string): string {
  if (!fs.existsSync(schemaPath)) {
    fail(PREFIX, `Schema file missing at ${schemaPath}`, { fix: FIX });
  }
  return fs.readFileSync(schemaPath, 'utf8');
}

function extractModel(schema: string, name: string): ModelBlock {
  const pattern = new RegExp(`model\\s+${name}\\s+\\{([\\s\\S]*?)\\n\\}`, 'm');
  const match = schema.match(pattern);
  if (match === null) {
    fail(PREFIX, `Missing Prisma model: ${name}`, { fix: FIX });
  }
  return { name, body: match[1] ?? '' };
}

function assertModelField(block: ModelBlock, field: string): void {
  const fieldPattern = new RegExp(`^\\s*${field}\\b`, 'm');
  if (!fieldPattern.test(block.body)) {
    fail(PREFIX, `Missing field ${block.name}.${field}`, { fix: FIX });
  }
}

function assertModelHasUnique(block: ModelBlock, pattern: RegExp, description: string): void {
  if (!pattern.test(block.body)) {
    fail(PREFIX, `Missing ${description} on ${block.name}`, { fix: FIX });
  }
}

async function main() {
  assertNoRuntimeDbAccess();
  const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma');
  const schema = loadSchema(schemaPath);
  if (/@default\s*\(\s*uuid\s*\(\s*\)\s*\)/.test(schema)) {
    throw Error('Prisma schema uses @default(uuid()) — derive or inject IDs explicitly for engine-visible models.');
  }

  const sourceFiles = fg.sync(['lib/**/*.ts', 'app/**/*.ts'], { absolute: true, ignore: ['**/node_modules/**'] });
  for (const file of sourceFiles) {
    const content = fs.readFileSync(file, 'utf8');
    if (content.includes('findMany(') && !content.includes('orderBy')) {
      throw Error(`findMany without orderBy detected in ${path.relative(process.cwd(), file)}`);
    }
  }

  const bankTransaction = extractModel(schema, 'BankTransaction');
  ['id', 'postedAt', 'amountMinor', 'source', 'externalId', 'incomeKind', 'p2pKind'].forEach((field) =>
    assertModelField(bankTransaction, field),
  );
  assertModelHasUnique(
    bankTransaction,
    /@@unique\s*\(\s*\[\s*userId\s*,\s*externalId\s*\]\s*,\s*(?:name|map):\s*"BankTransaction_userId_externalId"\s*\)/,
    'composite unique on userId/externalId',
  );

  const historicalEvaluation = extractModel(schema, 'HistoricalEngineEvaluation');
  ['runId', 'userId', 'bankTransactionId'].forEach((field) =>
    assertModelField(historicalEvaluation, field),
  );
  if (!/bankTransaction\b/.test(historicalEvaluation.body)) {
    fail(PREFIX, 'HistoricalEngineEvaluation missing bankTransaction relation', { fix: FIX });
  }

  const historicalIncomeRegime = extractModel(schema, 'HistoricalIncomeRegime');
  ['id', 'startMonth', 'endMonth', 'avgNetIncomeCents'].forEach((field) =>
    assertModelField(historicalIncomeRegime, field),
  );

  const historicalBucketTemplate = extractModel(schema, 'HistoricalBucketTemplate');
  ['id', 'bucketKey', 'monthlyLimitCents'].forEach((field) =>
    assertModelField(historicalBucketTemplate, field),
  );
}

void (async () => {
  try {
    await main();
  } catch (error: unknown) {
    const message = asMessage(error);
    fail(PREFIX, `Prisma schema assumption failed: ${message}`, { fix: FIX });
  }
})();
