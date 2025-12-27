import type { NextRequest } from 'next/server';
// NOTE: DailyState contract is type-locked. See docs/daily-state.md.
// Do not change semantics without bumping engineVersion.
import { NextResponse } from 'next/server';
import { withUser } from '../../../lib/with-user';
import { prisma } from '../../../lib/prisma';

export async function GET(request: NextRequest): Promise<NextResponse> {
  return withUser(request, async (userId) => {
    const latest = await prisma.dailyState.findFirst({
      where: { userId },
      orderBy: { computedAt: 'desc' },
    });

    if (latest === null) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    const {
      id,
      userId: ownerId,
      date,
      status,
      safeToSpendCents,
      nextRiskEvent,
      summary,
      computedAt,
      source,
      engineVersion,
      inputsVersion,
      errors,
    } = latest;

    return NextResponse.json({
      id,
      userId: ownerId,
      date,
      status,
      safeToSpendCents,
      nextRiskEvent,
      summary,
      computedAt,
      source,
      engineVersion,
      inputsVersion,
      errors,
    });
  });
}
