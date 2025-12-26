import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { withUser } from '../../../lib/with-user.js';
import { fetchActivityFeed, type ActivityItemType } from '../../../lib/activity/feed.js';

function hasNonEmptyString(value: string | null): value is string {
  return value !== null && value !== '';
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  return withUser(request, async (userId) => {
    const params = request.nextUrl.searchParams;
    const limitRaw = Number(params.get('limit'));
    const limit = Number.isFinite(limitRaw) ? Math.min(limitRaw, 200) : 50;
    const offsetRaw = Number(params.get('offset'));
    const offset = Number.isFinite(offsetRaw) ? Math.max(offsetRaw, 0) : 0;
    const fromParam = params.get('from');
    const toParam = params.get('to');
    const typeParam = params.get('type');

    const from = hasNonEmptyString(fromParam) ? new Date(fromParam) : null;
    const to = hasNonEmptyString(toParam) ? new Date(toParam) : null;
    const types = hasNonEmptyString(typeParam)
      ? (typeParam.split(',').map((t) => t.trim()).filter((t) => t !== '') as ActivityItemType[])
      : undefined;

    const feed = await fetchActivityFeed(userId, {
      limit,
      offset,
      from,
      to,
      type: types ?? null,
    });

    return NextResponse.json(feed);
  });
}
