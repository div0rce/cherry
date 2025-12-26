import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma.js';
import { logError } from '../../../../lib/logger.js';
import { asError } from '../../../../lib/errors.js';
import {
  assertUserId,
  logInvariant,
  resolveUserContext,
} from '../../../../lib/user-context.js';

export async function GET(_request: NextRequest): Promise<NextResponse> {
  const isProd = process.env.NODE_ENV === 'production';
  if (isProd) {
    logInvariant('Admin endpoint access in production', { endpoint: 'api/admin/health' });
    return NextResponse.json(
      { error: 'Admin tools are disabled in production' },
      { status: 403 }
    );
  }

  try {
    const { userId } = await resolveUserContext({
      requireAuth: true,
      allowLabDemo: false,
    });
    assertUserId(userId, 'api/admin/health GET');
  } catch (error) {
    asError(error);
    if (error.message.startsWith('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    logError('Error resolving user context in api/admin/health', error);
    return NextResponse.json({ error: 'Failed to resolve user context' }, { status: 500 });
  }

  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ message: 'Database OK' });
  } catch (caught) {
    asError(caught);
    logError('Admin health check failed', caught);
    return NextResponse.json({ message: 'Database error' }, { status: 500 });
  }
}
