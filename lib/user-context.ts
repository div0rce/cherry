import * as crypto from 'node:crypto';
import { getServerSession } from 'next-auth';
import { prisma } from './prisma';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { getServerConfig } from './config/store';
import type { ServerConfig } from './config/server';
import { logInvariant } from './logging';
import { assertUserId } from './invariants';
import { AppError } from './errors';

export type UserContextMode = 'AUTHENTICATED' | 'LAB_DEMO';

export interface ResolveUserContextOptions {
  requireAuth: boolean;
  allowLabDemo: boolean;
  sessionOverride?: { user?: { id?: string | null; email?: string | null } } | null;
  labUserFactory?: () => Promise<{ id: string; email?: string | null }>;
  getSession?: () => Promise<{ user?: { id?: string | null; email?: string | null } } | null>;
  serverConfig?: ServerConfig;
}

export interface UserContext {
  userId: string;
  mode: UserContextMode;
  email: string | null;
}

export const LAB_USER_EMAIL = 'lab+single-user@cherry.dev';
export const LAB_USER_NAME = 'Cherry Lab User';

function hasText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function fallbackEmail(userId: string): string {
  const digest = crypto.createHash('sha256').update(userId).digest('hex').slice(0, 24);
  return `user-${digest}@cherry.example.invalid`;
}

function fallbackEmailV2(userId: string): string {
  const digest = crypto.createHash('sha256').update(`v2:${userId}`).digest('hex').slice(0, 24);
  return `user-${digest}@cherry.example.invalid`;
}

async function ensureUserRow(params: { userId: string; email: string | null; name?: string | null }) {
  const { userId, email, name } = params;
  assertUserId(userId, 'ensureUserRow');
  const providedEmail = hasText(email) ? email.trim().toLowerCase() : null;
  const normalizedName = hasText(name) ? name.trim() : null;
  const safeFallback = fallbackEmail(userId);
  const safeFallback2 = fallbackEmailV2(userId);

  let emailForUpsert: string | null = providedEmail;
  if (emailForUpsert !== null) {
    const existing = await prisma.user.findUnique({ where: { email: emailForUpsert } });
    const ownedByUser = existing !== null && existing.id === userId;
    if (existing !== null && !ownedByUser) {
      emailForUpsert = null;
    }
  }

  const updateData: { email?: string; name?: string | null } = {};
  if (emailForUpsert !== null) {
    updateData.email = emailForUpsert;
  }
  if (normalizedName !== null) {
    updateData.name = normalizedName;
  }

  let createEmail = emailForUpsert ?? safeFallback;
  if (emailForUpsert === null) {
    const fallbackOwner = await prisma.user.findUnique({ where: { email: safeFallback } });
    const fallbackOwnedBySameUser = fallbackOwner !== null && fallbackOwner.id === userId;
    if (fallbackOwner !== null && !fallbackOwnedBySameUser) {
      createEmail = safeFallback2;
    }
  }

  try {
    return await prisma.user.upsert({
      where: { id: userId },
      update: updateData,
      create: {
        id: userId,
        email: createEmail,
        name: normalizedName,
      },
    });
  } catch (err: unknown) {
    if (isP2002Email(err)) {
      const retryUpdate: { name?: string | null } = {};
      if (normalizedName !== null) {
        retryUpdate.name = normalizedName;
      }

      const fallbackCandidates = [safeFallback, safeFallback2].filter(
        (candidate) => candidate !== createEmail
      );

      for (const candidate of fallbackCandidates) {
        try {
          return await prisma.user.upsert({
            where: { id: userId },
            update: retryUpdate,
            create: {
              id: userId,
              email: candidate,
              name: normalizedName,
            },
          });
        } catch (err2: unknown) {
          if (!isP2002Email(err2)) {
            throw err2;
          }
        }
      }
    }
    throw err;
  }
}

async function findOrCreateLabUser(
  factoryOverride: (() => Promise<{ id: string; email?: string | null }>) | undefined,
  serverConfig: ServerConfig
) {
  if (serverConfig.environment === 'production') {
    throw new AppError('UNAUTHORIZED', 'Unauthorized: lab demo mode is disabled in production', 401);
  }

  if (factoryOverride !== undefined) {
    const created = await factoryOverride();
    return ensureUserRow({
      userId: created.id,
      email: created.email ?? LAB_USER_EMAIL,
      name: LAB_USER_NAME,
    });
  }

  const existing = await prisma.user.findUnique({ where: { email: LAB_USER_EMAIL } });
  if (existing !== null) return existing;

  const created = await prisma.user.create({
    data: {
      email: LAB_USER_EMAIL,
      name: LAB_USER_NAME,
    },
  });
  return created;
}

export async function resolveUserContext(opts: ResolveUserContextOptions): Promise<UserContext> {
  const { requireAuth, allowLabDemo, sessionOverride, labUserFactory, getSession } = opts;
  const serverConfig = opts.serverConfig ?? getServerConfig();

  const session =
    sessionOverride ??
    (await (async () => {
      if (getSession !== undefined) return getSession();
      const mod = await import('../app/api/auth/[...nextauth]/route');
      return getServerSession((mod as { authOptions: unknown }).authOptions as never);
    })());

  const sessionUserRaw =
    session !== null &&
    session !== undefined &&
    typeof session === 'object' &&
    'user' in session
      ? (session as { user?: unknown }).user
      : undefined;
  const sessionUser =
    sessionUserRaw !== null && typeof sessionUserRaw === 'object' ? sessionUserRaw : null;
  const sessionUserIdValue =
    sessionUser !== null && 'id' in sessionUser ? (sessionUser as { id?: unknown }).id : undefined;
  const hasSessionUserId = typeof sessionUserIdValue === 'string' && sessionUserIdValue !== '';
  if (hasSessionUserId && typeof sessionUserIdValue === 'string') {
    let sessionEmail: string | null = null;
    if (
      sessionUser !== null &&
      'email' in sessionUser &&
      typeof (sessionUser as { email?: unknown }).email === 'string'
    ) {
      sessionEmail = (sessionUser as { email: string }).email;
    }
    let sessionName: string | null = null;
    if (
      sessionUser !== null &&
      'name' in sessionUser &&
      typeof (sessionUser as { name?: unknown }).name === 'string'
    ) {
      sessionName = (sessionUser as { name: string }).name;
    }
    await ensureUserRow({
      userId: sessionUserIdValue,
      email: sessionEmail,
      name: sessionName,
    });
    return {
      userId: sessionUserIdValue,
      mode: 'AUTHENTICATED',
      email: sessionEmail,
    };
  }

  const hasNoSession = session === null || session === undefined;
  if (hasNoSession && allowLabDemo === true) {
    const user = await findOrCreateLabUser(labUserFactory, serverConfig);
    await ensureUserRow({ userId: user.id, email: user.email ?? LAB_USER_EMAIL, name: user.name ?? LAB_USER_NAME });

    if (user.id === '') {
      throw new Error('Invariant: lab user upsert did not return an id');
    }

    return {
      userId: user.id,
      mode: 'LAB_DEMO',
      email: user.email ?? null,
    };
  }

  if (requireAuth === true && hasNoSession) {
    throw new AppError('UNAUTHORIZED', 'Unauthorized: no active session and lab demo not allowed', 401);
  }

  throw new Error(
    'Invariant: resolveUserContext reached unreachable state (check requireAuth/allowLabDemo flags)'
  );
}

export function isPrismaP2003(err: unknown): err is PrismaClientKnownRequestError {
  return err instanceof PrismaClientKnownRequestError && err.code === 'P2003';
}

function isP2002Email(err: unknown): boolean {
  if (!(err instanceof PrismaClientKnownRequestError)) return false;
  if (err.code !== 'P2002') return false;
  const metaTarget = (err.meta as { target?: unknown } | undefined)?.target;
  if (Array.isArray(metaTarget)) return metaTarget.includes('email');
  if (typeof metaTarget === 'string') return metaTarget === 'email';
  return false;
}

export { logInvariant, assertUserId, fallbackEmail, fallbackEmailV2 };
