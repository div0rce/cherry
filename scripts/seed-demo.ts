/**
 * Seed demo data (three cards + reward rules, two buckets) for an existing user.
 *
 * Usage:
 *   npm run seed:demo                 # seeds the first user found
 *   SEED_USER_EMAIL=you@example.com npm run seed:demo
 *   SEED_USER_ID=clt123 npm run seed:demo
 *   npm run seed:demo you@example.com  # CLI arg takes precedence
 */

import { prisma } from '../lib/prisma';
import { logError, logInfo } from '../lib/logger';
import { seedDemoForUser } from '../lib/demo-seeder';

async function resolveTargetUser() {
  const cliArg = process.argv[2];
  const envEmail = process.env.SEED_USER_EMAIL;
  const envUserId = process.env.SEED_USER_ID;

  const findByEmail = (email: string) =>
    prisma.user.findUnique({ where: { email } });
  const findById = (id: string) => prisma.user.findUnique({ where: { id } });

  if (cliArg) {
    const selectorLabel = cliArg.includes('@') ? `email "${cliArg}"` : `id "${cliArg}"`;
    const user = cliArg.includes('@') ? await findByEmail(cliArg) : await findById(cliArg);
    if (!user) {
      throw new Error(
        `No user found for ${selectorLabel}. Sign in through the app, then rerun the seed command with a valid account.`
      );
    }
    return user;
  }

  if (envEmail) {
    const user = await findByEmail(envEmail);
    if (!user) {
      throw new Error(
        `SEED_USER_EMAIL is set to "${envEmail}", but no matching user exists. Sign in first, then rerun the seed command.`
      );
    }
    return user;
  }

  if (envUserId) {
    const user = await findById(envUserId);
    if (!user) {
      throw new Error(
        `SEED_USER_ID is set to "${envUserId}", but no matching user exists. Sign in first, then rerun the seed command.`
      );
    }
    return user;
  }

  const fallbackUser = await prisma.user.findFirst();
  if (!fallbackUser) {
    throw new Error(
      'No users found. Sign in through the app once, then rerun `npm run seed:demo` (optionally set SEED_USER_EMAIL).'
    );
  }
  return fallbackUser;
}

async function main() {
  const user = await resolveTargetUser();

  await seedDemoForUser(user.id);
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
