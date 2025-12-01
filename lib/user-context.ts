import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

export type UserContextMode = 'AUTHENTICATED' | 'LAB_DEMO';

export interface ResolveUserContextOptions {
  requireAuth: boolean;
  allowLabDemo: boolean;
}

export interface UserContext {
  userId: string;
  mode: UserContextMode;
  email: string | null;
}

const LAB_EMAIL = 'lab+single-user@cherry.dev';
const LAB_NAME = 'Cherry Lab User';

export async function resolveUserContext(opts: ResolveUserContextOptions): Promise<UserContext> {
  const { requireAuth, allowLabDemo } = opts;
  const isProd = process.env.NODE_ENV === 'production';

  const session = await getServerSession(authOptions);

  if (session?.user?.id) {
    return {
      userId: session.user.id,
      mode: 'AUTHENTICATED',
      email: session.user.email ?? null,
    };
  }

  if (!session && allowLabDemo) {
    if (isProd) {
      throw new Error('Unauthorized: lab demo mode is disabled in production');
    }

    const user = await prisma.user.upsert({
      where: { email: LAB_EMAIL },
      create: {
        email: LAB_EMAIL,
        name: LAB_NAME,
      },
      update: {},
    });

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
