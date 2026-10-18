import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma.js';
import { resolveUserContext } from '../../../../lib/user-context.js';
import { auth } from '../../../../lib/auth.js';
import { asAppError, isUnauthorized } from '../../../../lib/errors.js';
import { logError } from '../../../../lib/logger.js';

export async function GET(request: Request): Promise<Response> {
  try {
    const { userId } = await resolveUserContext({
      getSession: auth,
      requireAuth: true,
      allowLabDemo: true,
    });
    const { searchParams } = new URL(request.url);
    const query = (searchParams.get('query') ?? '').trim();

    const merchants = await prisma.bankTransaction.findMany({
      // One merchantName filter: a spread followed by a second merchantName key used to drop the
      // search term and always return the most recent names.
      where: {
        userId,
        merchantName:
          query !== '' ? { not: null, contains: query, mode: 'insensitive' } : { not: null },
      },
      select: { merchantName: true },
      take: 20,
      orderBy: { postedAt: 'desc' },
    });

    const names = Array.from(
      new Set(
        merchants
          .map((m) => m.merchantName ?? '')
          .filter((m): m is string => m !== '' && m !== null)
      )
    );

    return NextResponse.json({ names });
  } catch (error: unknown) {
    const appError = asAppError(error);
    if (isUnauthorized(appError)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    logError('user_merchants_failed', appError);
    return NextResponse.json({ error: 'merchant_lookup_failed', names: [] }, { status: 500 });
  }
}
