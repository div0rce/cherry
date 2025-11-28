import type { User } from '@prisma/client';
import { prisma } from '@/lib/prisma';

/**
 * Ensure a User row exists for the given id.
 * In dev we upsert a minimal user if missing to avoid FK errors.
 */
export async function ensureUser(userId: string): Promise<User> {
  const syntheticEmail = `${userId}@dev.cherry.local`;
  return prisma.user.upsert({
    where: { id: userId },
    update: {},
    create: {
      id: userId,
      email: syntheticEmail,
      name: 'Cherry Dev User',
    },
  });
}
