import { prisma } from '@/lib/prisma';

export async function resolveUserIdForExternalIds(opts: {
  accountExternalId?: string | null;
  userExternalId?: string | null;
}): Promise<string | null> {
  const { accountExternalId, userExternalId } = opts;

  if (userExternalId) {
    const user = await prisma.user.findUnique({
      where: { email: userExternalId },
      select: { id: true },
    });
    if (user?.id) return user.id;
  }

  if (accountExternalId) {
    const account = await prisma.account.findFirst({
      where: { providerAccountId: accountExternalId },
      select: { userId: true },
    });
    if (account?.userId) return account.userId;
  }

  return null;
}
