import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logError } from '@/lib/logger';

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      ok: true,
      db: 'ok',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logError('Health check failed', error);
    return NextResponse.json(
      {
        ok: false,
        db: 'error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
