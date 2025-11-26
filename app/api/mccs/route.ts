import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logError } from '@/lib/logger';

export async function GET() {
  try {
    const rows = await prisma.mccToRewardCategory.findMany({
      include: {
        mcc: true,
      },
      orderBy: {
        mccCode: 'asc',
      },
    });

    const result = rows.map((row) => ({
      mccCode: row.mccCode,
      rewardCategory: row.category,
      description: row.mcc.description,
      notes: row.mcc.notes,
    }));

    return NextResponse.json(result);
  } catch (error) {
    logError('Error fetching MCCs', error);
    return new NextResponse('Failed to fetch MCCs', { status: 500 });
  }
}
