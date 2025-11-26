import { NextResponse } from 'next/server';
import { withUser } from '@/lib/with-user';
import { logError, logInfo } from '@/lib/logger';
import { seedDemoForUser } from '@/lib/demo-seeder';

export async function POST(request: Request) {
  return withUser(request, async (userId) => {
    try {
      const summary = await seedDemoForUser(userId);
      logInfo('Seeded demo data via API', { userId, summary });
      return NextResponse.json({ message: 'Demo data seeded', summary });
    } catch (error) {
      logError('Failed to seed demo data via API', error);
      return NextResponse.json({ error: 'Failed to seed demo data' }, { status: 500 });
    }
  });
}
