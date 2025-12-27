import { prisma } from '../prisma';

export async function resolveUserIdForExternalIds(opts: {
  accountExternalId?: string | null;
  userExternalId?: string | null;
}): Promise<string | null> {
  const { accountExternalId, userExternalId } = opts;

  const hasUserExternalId =
    userExternalId !== undefined && userExternalId !== null && userExternalId !== '';
  if (hasUserExternalId) {
    const user = await prisma.user.findUnique({
      where: { email: userExternalId },
      select: { id: true },
    });
    if (user !== null && user.id !== '') return user.id;
  }

  const hasAccountExternalId =
    accountExternalId !== undefined && accountExternalId !== null && accountExternalId !== '';
  if (hasAccountExternalId) {
    const account = await prisma.account.findFirst({
      where: { providerAccountId: accountExternalId },
      select: { userId: true },
    });
    if (account !== null && account.userId !== '') return account.userId;
  }

  return null;
}
