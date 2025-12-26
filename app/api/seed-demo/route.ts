import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { logError, logInfo } from '@/lib/logger';
import { seedDemoForUser } from '@/lib/demo-seeder';
import { asError, asLogMeta } from '@/lib/errors';
import {
  assertUserId,
  isPrismaP2003,
  logInvariant,
  resolveUserContext,
} from '@/lib/user-context';

export async function POST(_request: NextRequest): Promise<NextResponse> {
  const isProd = process.env.NODE_ENV === 'production';
  if (isProd) {
    logInvariant('Demo seed endpoint hit in production', { endpoint: 'api/seed-demo' });
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
  } catch (error) {
    asError(error);
    if (error.message.startsWith('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    logError('Error resolving user context in api/seed-demo POST', error);
    return NextResponse.json({ error: 'Failed to resolve user context' }, { status: 500 });
  }

  try {
    assertUserId(userId, 'api/seed-demo POST');
    const summary = await seedDemoForUser(userId);
    logInfo('Seeded demo data via API', { userId, mode, summary });
    return NextResponse.json({ message: 'Demo data seeded', summary });
  } catch (error: unknown) {
    asError(error);
    if (isPrismaP2003(error)) {
      logInvariant('P2003 in api/seed-demo POST', {
        userId,
        mode,
        meta: asLogMeta(error.meta),
        err: error,
      });
    } else {
      logInvariant('Error in api/seed-demo POST', { userId, mode, err: error });
    }
    logError('Failed to seed demo data via API', error);
    return NextResponse.json({ error: 'Failed to seed demo data' }, { status: 500 });
  }
}
