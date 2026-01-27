import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma.js';
import { resolveUserContext } from '../../../../lib/user-context.js';
import { auth } from '../../../../lib/auth.js';

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
      where: {
        userId,
        ...(query !== '' ? { merchantName: { contains: query, mode: 'insensitive' } } : {}),
        merchantName: { not: null },
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
    void error;
    return NextResponse.json({ names: [] });
  }
}
