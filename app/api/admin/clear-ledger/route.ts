import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/auth';

export async function POST() {
  try {
    const userId = await getCurrentUserId();

    const ledgerResult = await prisma.cherryPointLedger.deleteMany({
      where: { userId },
    });

    return NextResponse.json({
      ok: true,
      deletedLedger: ledgerResult.count,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('not authenticated')) {
      return new NextResponse('Unauthorized', { status: 401 });
    }
    return new NextResponse('Failed to clear ledger', { status: 500 });
  }
}
