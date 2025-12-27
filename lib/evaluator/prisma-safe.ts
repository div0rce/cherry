import { prisma } from '../prisma';

function hasModel(client: Record<string, unknown> | null | undefined, key: string): boolean {
  if (client == null || typeof client !== 'object') return false;
  const value = client[key];
  return value != null && typeof (value as Record<string, unknown>)['count'] === 'function';
}

export async function assertOfflineEvaluatorModelsReady(): Promise<void> {
  const client = prisma as unknown as Record<string, unknown>;
  const hasIncomeRegime = hasModel(client, 'historicalIncomeRegime');
  const hasBucketTemplate = hasModel(client, 'historicalBucketTemplate');

  if (!hasIncomeRegime || !hasBucketTemplate) {
    throw new Error(
      [
        'Offline evaluator models missing from Prisma client.',
        'Run:',
        '  npx prisma migrate deploy',
        '  npx prisma generate',
        'Then restart `npm run dev` so the new client is loaded.',
      ].join('\n'),
    );
  }

  try {
    await Promise.all([
      prisma.historicalIncomeRegime.count({ take: 0 }),
      prisma.historicalBucketTemplate.count({ take: 0 }),
    ]);
  } catch (error: unknown) {
    void error;
    throw new Error(
      [
        'Offline evaluator tables are not available. Ensure migrations are applied:',
        '  npx prisma migrate deploy',
        '  npx prisma generate',
        'Then restart `npm run dev`.',
      ].join('\n'),
    );
  }
}
