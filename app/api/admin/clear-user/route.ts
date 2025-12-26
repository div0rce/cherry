import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logError, logInfo } from '@/lib/logger';
import {
  assertUserId,
  isPrismaP2003,
  logInvariant,
  resolveUserContext,
} from '@/lib/user-context';
import { asError, asLogMeta } from '@/lib/errors';

export async function POST(_request: NextRequest): Promise<NextResponse> {
  const isProd = process.env.NODE_ENV === 'production';
  if (isProd) {
    logInvariant('Admin endpoint access in production', { endpoint: 'api/admin/clear-user' });
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
    asError(error);
    if (error.message.startsWith('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    logError('Error resolving user context in api/admin/clear-user', error);
    return NextResponse.json({ error: 'Failed to resolve user context' }, { status: 500 });
  }

  try {
    assertUserId(userId, 'api/admin/clear-user POST');
    const results = await prisma.$transaction(async (tx) => {
      const ledger = await tx.cherryPointLedger.deleteMany({ where: { userId } });
      const sessions = await tx.recommendationSession.deleteMany({ where: { userId } });
      const transactions = await tx.simulatedTransaction.deleteMany({ where: { userId } });
      const simulations = await tx.simulation.deleteMany({ where: { userId } });
      const buckets = await tx.bucket.deleteMany({ where: { userId } });
      const cards = await tx.card.deleteMany({ where: { userId } });
      return { ledger, sessions, transactions, simulations, buckets, cards };
    });

    const summary = {
      cherryPointLedger: results.ledger.count,
      recommendationSessions: results.sessions.count,
      simulatedTransactions: results.transactions.count,
      simulations: results.simulations.count,
      buckets: results.buckets.count,
      cards: results.cards.count,
    };

    logInfo('Cleared user data via admin endpoint', { userId, mode, summary });

    return NextResponse.json({ message: 'User data cleared', deleted: summary });
  } catch (error: unknown) {
    asError(error);
    if (isPrismaP2003(error)) {
      logInvariant('P2003 in api/admin/clear-user POST', {
        userId,
        mode,
        meta: asLogMeta((error as { meta?: unknown }).meta),
        err: error,
      });
    } else {
      logInvariant('Error in api/admin/clear-user POST', { userId, mode, err: error });
    }
    logError('Failed to clear user data', error);
    return new NextResponse('Failed to clear user data', { status: 500 });
  }
}
