import { createRequire } from 'node:module';

const requireFn = createRequire(import.meta.url);
requireFn('ts-node/register/transpile-only');

const { prisma } = requireFn('../lib/prisma.ts') as typeof import('../lib/prisma.ts');

async function main(): Promise<void> {
  const buckets = await prisma.bucket.findMany({
    where: { lastResetAt: null },
    select: { id: true, periodStart: true, createdAt: true },
  });

  for (const bucket of buckets) {
    const lastResetAt = bucket.periodStart ?? bucket.createdAt;
    await prisma.bucket.update({
      where: { id: bucket.id },
      data: { lastResetAt },
    });
  }
  console.warn(`Backfilled lastResetAt for ${buckets.length} buckets`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
