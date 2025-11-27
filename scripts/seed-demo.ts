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
  const ensureByEmail = async (email: string) => {
    const existing = await findByEmail(email);
    if (existing) return existing;
    return prisma.user.create({ data: { email } });
  };

  if (cliArg) {
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

  if (envEmail) {
    return ensureByEmail(envEmail);
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
    // As a last resort, create a default dev user to allow seeding without a prior session.
    return prisma.user.create({ data: { email: 'dev@example.com' } });
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
