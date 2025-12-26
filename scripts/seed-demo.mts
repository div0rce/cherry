/**
 * Seed demo data (three cards + reward rules, two buckets) for an existing user.
 *
 * Usage:
 *   npm run seed:demo                 # seeds the first user found
 *   SEED_USER_EMAIL=you@example.com npm run seed:demo
 *   SEED_USER_ID=clt123 npm run seed:demo
 *   npm run seed:demo you@example.com  # CLI arg takes precedence
 */

import { prisma } from '../lib/prisma.ts';
import { logError, logInfo } from '../lib/logger.ts';
import { seedDemoForUser } from '../lib/demo-seeder.ts';
import { LAB_USER_EMAIL, LAB_USER_NAME } from '../lib/user-context.ts';
import { ensureTsEsm } from './lib/ensure-ts-esm.ts';

ensureTsEsm();


const hasText = (value?: string | null): value is string =>
  value !== undefined && value !== null && value !== '';

async function resolveTargetUser() {
  const cliArg = process.argv[2];
  const envEmail = process.env['SEED_USER_EMAIL'];
  const envUserId = process.env['SEED_USER_ID'];
  const isProd = process.env.NODE_ENV === 'production';

  if (isProd) {
    throw new Error('Demo seeding scripts are disabled in production');
  }

  const findByEmail = (email: string) =>
    prisma.user.findUnique({ where: { email } });
  const findById = (id: string) => prisma.user.findUnique({ where: { id } });
  const ensureByEmail = async (email: string) => {
    const existing = await findByEmail(email);
    if (existing) return existing;
    return prisma.user.create({
      data: {
        email,
        ...(email === LAB_USER_EMAIL ? { name: LAB_USER_NAME } : {}),
      },
    });
  };

  if (hasText(cliArg)) {
    const selectorLabel = cliArg.includes('@') ? `email "${cliArg}"` : `id "${cliArg}"`;
    if (cliArg.includes('@')) {
      return ensureByEmail(cliArg);
    }
    const user = await findById(cliArg);
    if (user) return user;
    throw new Error(
      `No user found for ${selectorLabel}. Use an email to auto-create or sign in through the app, then rerun the seed command with a valid account.`
    );
  }

  if (hasText(envEmail)) {
    return ensureByEmail(envEmail);
  }

  if (hasText(envUserId)) {
    const user = await findById(envUserId);
    if (!user) {
      throw new Error(
        `SEED_USER_ID is set to "${envUserId}", but no matching user exists. Sign in first, then rerun the seed command.`
      );
    }
    return user;
  }

  return ensureByEmail(LAB_USER_EMAIL);
}

async function main() {
  const user = await resolveTargetUser();
  const now = new Date();

  await seedDemoForUser(user.id, { now });
  logInfo(`Seeded demo data for user ${user.email ?? user.id}.`);
}

main()
  .catch((err) => {
    logError('Demo seed failed', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
