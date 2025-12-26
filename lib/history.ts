import { prisma } from './prisma.js';

export type HistorySource = 'VINE_SIM' | 'MANUAL_LOOKUP' | 'OTHER';

export interface PurchaseHistoryItem {
  id: string;
  occurredAt: Date;
  amountCents: number;
  currency: string;
  merchantName: string | null;
  mcc: number | null;
  source: HistorySource;
  cardName: string | null;
  pointsAwarded: number;
  status: string;
}

export async function getPurchaseHistoryForUser(
  userId: string,
  limit = 25,
): Promise<PurchaseHistoryItem[]> {
  const ledgerRows = await prisma.cherryPointLedger.findMany({
    where: { userId },
    orderBy: { awardedAt: 'desc' },
    take: limit,
    include: {
      session: {
        include: {
          recommendedCard: { select: { nickname: true } },
        },
      },
    },
  });

  return ledgerRows.map((row) => {
    const session = row.session;
    const source: HistorySource =
      session?.deviceId != null && session.deviceId.length > 0
        ? 'VINE_SIM'
        : session
          ? 'MANUAL_LOOKUP'
          : 'OTHER';

    return {
      id: row.id,
      occurredAt: row.awardedAt ?? row.createdAt,
      amountCents: session?.amountCents ?? 0,
      currency: session?.currency ?? 'USD',
      merchantName: session?.merchantName ?? null,
      mcc: session?.mccCode ?? null,
      source,
      cardName: session?.recommendedCard?.nickname ?? null,
      pointsAwarded: row.points,
      status: row.status,
    };
  });
}
