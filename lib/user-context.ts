import { getServerSession } from 'next-auth';
import { prisma } from './prisma.ts';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { logInvariant } from './logging.ts';
import { assertUserId } from './invariants.ts';

export type UserContextMode = 'AUTHENTICATED' | 'LAB_DEMO';

export interface ResolveUserContextOptions {
  requireAuth: boolean;
  allowLabDemo: boolean;
  sessionOverride?: { user?: { id?: string | null; email?: string | null } } | null;
  labUserFactory?: () => Promise<{ id: string; email?: string | null }>;
  getSession?: () => Promise<{ user?: { id?: string | null; email?: string | null } } | null>;
}

export interface UserContext {
  userId: string;
  mode: UserContextMode;
  email: string | null;
}

export const LAB_USER_EMAIL = 'lab+single-user@cherry.dev';
export const LAB_USER_NAME = 'Cherry Lab User';

async function findOrCreateLabUser(factoryOverride?: () => Promise<{ id: string; email?: string | null }>) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Unauthorized: lab demo mode is disabled in production');
  }

  if (factoryOverride) {
    return factoryOverride();
  }

  const existing = await prisma.user.findUnique({ where: { email: LAB_USER_EMAIL } });
  if (existing) return existing;

  return prisma.user.create({
    data: {
      email: LAB_USER_EMAIL,
      name: LAB_USER_NAME,
    },
  });
}

export async function resolveUserContext(opts: ResolveUserContextOptions): Promise<UserContext> {
  const { requireAuth, allowLabDemo, sessionOverride, labUserFactory, getSession } = opts;

  const session =
    sessionOverride ??
    (await (async () => {
      if (getSession) return getSession();
      const mod = await import('../app/api/auth/[...nextauth]/route');
      return getServerSession((mod as { authOptions: unknown }).authOptions as never);
    })());

  if (session?.user?.id) {
    return {
      userId: session.user.id,
      mode: 'AUTHENTICATED',
      email: session.user.email ?? null,
    };
  }

  if (!session && allowLabDemo) {
    const user = await findOrCreateLabUser(labUserFactory);

    if (!user.id) {
      throw new Error('Invariant: lab user upsert did not return an id');
    }

    return {
      userId: user.id,
      mode: 'LAB_DEMO',
      email: user.email ?? null,
    };
  }

  if (requireAuth && !session) {
    throw new Error('Unauthorized: no active session and lab demo not allowed');
  }

  throw new Error(
    'Invariant: resolveUserContext reached unreachable state (check requireAuth/allowLabDemo flags)'
  );
}

export function isPrismaP2003(err: unknown): err is PrismaClientKnownRequestError {
  return err instanceof PrismaClientKnownRequestError && err.code === 'P2003';
}

export { logInvariant, assertUserId };
