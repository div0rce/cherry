import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { withUser } from '@/lib/with-user';
import { fetchActivityFeed, type ActivityItemType } from '@/lib/activity/feed';

export async function GET(request: NextRequest): Promise<NextResponse> {
  return withUser(request, async (userId) => {
    const params = request.nextUrl.searchParams;
    const limit = Math.min(Number(params.get('limit')) || 50, 200);
    const offset = Math.max(Number(params.get('offset')) || 0, 0);
    const fromParam = params.get('from');
    const toParam = params.get('to');
    const typeParam = params.get('type');

    const from = fromParam ? new Date(fromParam) : null;
    const to = toParam ? new Date(toParam) : null;
    const types = typeParam?.split(',').map((t) => t.trim()).filter(Boolean) as
      | ActivityItemType[]
      | undefined;

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
