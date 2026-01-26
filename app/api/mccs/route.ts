import type { NextRequest } from 'next/server';
import { prisma } from '../../../lib/prisma.js';
import { apiHandler } from '../../../lib/api/handler.js';

export function GET(_req: NextRequest): Promise<Response> {
  return apiHandler(async () => {
    const rows = await prisma.mccToRewardCategory.findMany({
      include: {
        mcc: true,
      },
      orderBy: {
        mccCode: 'asc',
      },
    });

    return rows.map((row) => ({
      mccCode: row.mccCode,
      rewardCategory: row.category,
      description: row.mcc.description,
      notes: row.mcc.notes,
    }));
  });
}
