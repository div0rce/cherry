import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  assertUserId,
  isPrismaP2003,
  logInvariant,
  resolveUserContext,
} from '@/lib/user-context';

export async function POST(_req: NextRequest): Promise<NextResponse> {
  const isProd = process.env.NODE_ENV === 'production';
  if (isProd) {
    logInvariant('Admin endpoint access in production', { endpoint: 'api/admin/clear-sessions' });
    return NextResponse.json(
      { error: 'Admin tools are disabled in production' },
      { status: 403 }
    );
  }

  let userId: string | null = null;
  let mode: string | null = null;

  try {
    const ctx = await resolveUserContext({
      requireAuth: true,
      allowLabDemo: false,
    });
    userId = ctx.userId;
    mode = ctx.mode;
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return new NextResponse('Unauthorized', { status: 401 });
    }
    return new NextResponse('Failed to resolve user context', { status: 500 });
  }

  try {
    assertUserId(userId, 'api/admin/clear-sessions POST');

    const ledgerResult = await prisma.cherryPointLedger.deleteMany({
      where: { userId },
    });

    const sessionResult = await prisma.recommendationSession.deleteMany({
      where: { userId },
    });

    return NextResponse.json({
      ok: true,
      deletedLedger: ledgerResult.count,
      deletedSessions: sessionResult.count,
    });
  } catch (error: unknown) {
    if (isPrismaP2003(error)) {
      logInvariant('P2003 in api/admin/clear-sessions POST', { userId, mode, meta: error.meta });
    } else {
      logInvariant('Error in api/admin/clear-sessions POST', { userId, mode, error });
    }
    return new NextResponse('Failed to clear sessions', { status: 500 });
  }
}
