import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withUser } from '@/lib/with-user';
import { logError } from '@/lib/logger';

export async function GET(request: Request) {
  return withUser(request, async () => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return NextResponse.json({ message: 'Database OK' });
    } catch (err) {
      logError('Admin health check failed', err);
      return NextResponse.json({ message: 'Database error' }, { status: 500 });
    }
  });
}
