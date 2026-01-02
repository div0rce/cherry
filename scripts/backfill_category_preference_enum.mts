import { RewardCategory } from '@prisma/client';
import { prisma } from '../lib/prisma.ts';
import { ensureTsEsm } from './lib/ensure-ts-esm.mts';
import { asMessage } from './guardrails/lib/error.mts';
import { fail } from './guardrails/lib/fail.mts';

ensureTsEsm();

const PREFIX = 'backfill-category-preference-enum';
const FIX = 'Ensure prisma access and the CategoryPreference table schema.';

async function main(): Promise<void> {
  // Check if legacy column still exists; if not, exit early.
  const columnCheck = await prisma.$queryRaw<Array<{ exists: boolean }>>`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_name = 'CategoryPreference'
        AND column_name = 'categoryEnum'
    ) as "exists";
  `;
  const columnExists = columnCheck[0]?.exists ?? false;
  if (columnExists !== true) {
    console.warn('categoryEnum column not found; schema already migrated. Nothing to backfill.');
    return;
  }

  // If legacy column exists, perform a raw backfill to avoid type drift in generated client.
  const rawCounts = await prisma.$queryRaw<
    Array<{ count: bigint }>
  >`SELECT COUNT(*)::bigint as count FROM "CategoryPreference" WHERE "categoryEnum" IS NULL`;
  const count = rawCounts[0]?.count ?? 0n;

  const enumValues = (Object.values(RewardCategory) as string[])
    .map((val) => `'${val}'`)
    .join(',');

  await prisma.$executeRawUnsafe(`
    UPDATE "CategoryPreference"
    SET "categoryEnum" = (
      CASE
        WHEN UPPER(REPLACE(REPLACE("category", ' ', '_'), '-', '_')) IN (${enumValues}) THEN UPPER(REPLACE(REPLACE("category", ' ', '_'), '-', '_'))::"RewardCategory"
        ELSE 'OTHER'::"RewardCategory"
      END
    )
    WHERE "categoryEnum" IS NULL;
  `);

  console.warn(`Backfilled legacy CategoryPreference rows: ${Number(count)}`);
}

main()
  .then(() => {
    console.warn('Done.');
  })
  .catch((err: unknown) => {
    const message = asMessage(err);
    fail(PREFIX, `Backfill failed: ${message}`, { fix: FIX });
  });
