import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { withUser } from '@/lib/with-user';
import { logError, logInfo } from '@/lib/logger';
import { seedCardsAndBucketsForUser } from '@/lib/demo-seeder';

export async function POST(request: NextRequest): Promise<NextResponse> {
  return withUser(request, async (userId) => {
    try {
      const summary = await seedCardsAndBucketsForUser(userId);
      logInfo('Seeded cards & buckets via API', { userId, summary });
      return NextResponse.json({ message: 'Seeded cards and buckets', summary });
    } catch (error) {
      logError('Failed to seed cards & buckets via API', error);
      return NextResponse.json({ error: 'Failed to seed cards & buckets' }, { status: 500 });
    }
  });
}
