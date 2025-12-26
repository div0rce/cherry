import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { logError, logInfo } from '../../../../lib/logger.js';
import { seedCardsAndBucketsForUser } from '../../../../lib/demo-seeder.js';
import {
  assertUserId,
  isPrismaP2003,
  logInvariant,
  resolveUserContext,
} from '../../../../lib/user-context.js';
import { asAppError, asLogMeta } from '../../../../lib/errors.js';

export async function POST(_request: NextRequest): Promise<NextResponse> {
  const isProd = process.env.NODE_ENV === 'production';
  if (isProd) {
    logInvariant('Demo seed endpoint hit in production', { endpoint: 'api/seed-demo/cards-buckets' });
    return NextResponse.json(
      { error: 'Demo seeding is disabled in production' },
      { status: 403 }
    );
  }

  let userId: string | null = null;
  let mode: string | null = null;

  try {
    const ctx = await resolveUserContext({
      requireAuth: false,
      allowLabDemo: true,
    });
    userId = ctx.userId;
    mode = ctx.mode;
  } catch (error: unknown) {
    const appError = asAppError(error);
    if (appError.message.startsWith('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    logError('Error resolving user context in api/seed-demo/cards-buckets POST', appError);
    return NextResponse.json({ error: 'Failed to resolve user context' }, { status: 500 });
  }

  try {
    assertUserId(userId, 'api/seed-demo/cards-buckets POST');
    const now = new Date();
    const summary = await seedCardsAndBucketsForUser(userId, { now });
    logInfo('Seeded cards & buckets via API', { userId, mode, summary });
    return NextResponse.json({ message: 'Seeded cards and buckets', summary });
  } catch (error: unknown) {
    const appError = asAppError(error);
    if (isPrismaP2003(error)) {
      logInvariant('P2003 in api/seed-demo/cards-buckets POST', {
        userId,
        mode,
        meta: asLogMeta(error.meta),
        err: error,
      });
    } else {
      logInvariant('Error in api/seed-demo/cards-buckets POST', { userId, mode, err: appError });
    }
    logError('Failed to seed cards & buckets via API', appError);
    return NextResponse.json({ error: 'Failed to seed cards & buckets' }, { status: 500 });
  }
}
