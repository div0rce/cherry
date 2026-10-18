import { prisma } from '../prisma.js';

function isPresent(value: string | null | undefined): value is string {
  return typeof value === 'string' && value !== '';
}

async function findUserIdByEmail(email: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  return isPresent(user?.id) ? user.id : null;
}

async function findUserIdByProviderAccount(providerAccountId: string): Promise<string | null> {
  const account = await prisma.account.findFirst({
    where: { providerAccountId },
    select: { userId: true },
  });
  return isPresent(account?.userId) ? account.userId : null;
}

export async function resolveUserIdForExternalIds(opts: {
  accountExternalId?: string | null;
  userExternalId?: string | null;
}): Promise<string | null> {
  const { accountExternalId, userExternalId } = opts;

  if (isPresent(userExternalId)) {
    const userId = await findUserIdByEmail(userExternalId);
    if (userId !== null) return userId;
  }

  if (isPresent(accountExternalId)) {
    return findUserIdByProviderAccount(accountExternalId);
  }

  return null;
}
