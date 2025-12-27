import type {
  CherryPointLedger,
  Prisma,
  RecommendationSession,
  RecommendationSource,
  RewardCategory,
} from '@prisma/client';
import { prisma } from '../prisma';

export type ActivityItemType =
  | 'SESSION_CREATED'
  | 'SESSION_CONFIRMED'
  | 'LEDGER_POSTED'
  | 'LEDGER_REVOKED';

export interface ActivityItem {
  type: ActivityItemType;
  occurredAt: Date;
  sessionId: string | null;
  amountCents?: number;
  category?: RewardCategory;
  source?: RecommendationSource;
  verdict?: RecommendationSession['verdict'];
  merchantName?: string | null;
  points?: number;
}

export interface ActivityFeedResult {
  items: ActivityItem[];
  pagination: {
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export interface ActivityFeedFilters {
  limit?: number;
  offset?: number;
  from?: Date | null;
  to?: Date | null;
  type?: ActivityItemType[] | null;
}

export async function fetchActivityFeed(
  userId: string,
  filters: ActivityFeedFilters = {}
): Promise<ActivityFeedResult> {
  const limit = Math.min(filters.limit ?? 50, 200);
  const offset = Math.max(filters.offset ?? 0, 0);
  const from = filters.from ?? null;
  const to = filters.to ?? null;

  const typeSet = filters.type ? new Set(filters.type) : null;

  const sessionCreatedFilter: { gte?: Date; lte?: Date } = {};
  if (from) sessionCreatedFilter.gte = from;
  if (to) sessionCreatedFilter.lte = to;
  const hasSessionCreatedBounds = sessionCreatedFilter.gte !== undefined || sessionCreatedFilter.lte !== undefined;

  const sessionWhere: Prisma.RecommendationSessionWhereInput = {
    userId,
    ...(hasSessionCreatedBounds ? { createdAt: sessionCreatedFilter } : {}),
  };

  const ledgerAwardedFilter: { gte?: Date; lte?: Date } = {};
  if (from) ledgerAwardedFilter.gte = from;
  if (to) ledgerAwardedFilter.lte = to;
  const hasLedgerAwardedBounds =
    ledgerAwardedFilter.gte !== undefined || ledgerAwardedFilter.lte !== undefined;

  const ledgerWhere: Prisma.CherryPointLedgerWhereInput = {
    userId,
    ...(hasLedgerAwardedBounds ? { awardedAt: ledgerAwardedFilter } : {}),
  };

  const sessions = (await prisma.recommendationSession.findMany({
    where: sessionWhere,
    orderBy: { createdAt: 'desc' },
    take: limit + 100,
    include: {
      ledgerEntries: true,
    },
  })) as unknown as (RecommendationSession & { ledgerEntries: CherryPointLedger[] })[];

  const ledgers = (await prisma.cherryPointLedger.findMany({
    where: ledgerWhere,
    orderBy: { awardedAt: 'desc' },
    take: limit + 200,
  })) as unknown as CherryPointLedger[];

  const items: ActivityItem[] = [];

  sessions.forEach((session) => {
    items.push({
      type: 'SESSION_CREATED',
      occurredAt: session.createdAt,
      sessionId: session.id,
      amountCents: session.amountCents,
      category: session.category,
      source: session.source,
      verdict: session.verdict,
      merchantName: session.merchantName,
    });

    if (Array.isArray(session.ledgerEntries) && session.ledgerEntries.length > 0) {
      const firstLedger = [...session.ledgerEntries].sort(
        (a, b) => (a.awardedAt?.getTime() ?? a.createdAt.getTime()) - (b.awardedAt?.getTime() ?? b.createdAt.getTime())
      )[0];
      if (firstLedger) {
        items.push({
          type: 'SESSION_CONFIRMED',
          occurredAt: firstLedger.awardedAt ?? firstLedger.createdAt,
          sessionId: session.id,
          amountCents: session.amountCents,
          points: firstLedger.points,
        });
      }
    }
  });

  ledgers.forEach((ledger) => {
    if (ledger.status === 'POSTED') {
      items.push({
        type: 'LEDGER_POSTED',
        occurredAt: ledger.awardedAt ?? ledger.createdAt,
        sessionId: ledger.sessionId,
        points: ledger.points,
      });
    } else if (ledger.status === 'REVOKED') {
      items.push({
        type: 'LEDGER_REVOKED',
        occurredAt: ledger.revokedAt ?? ledger.awardedAt ?? ledger.createdAt,
        sessionId: ledger.sessionId,
        points: ledger.points,
      });
    }
  });

  const filtered = typeSet ? items.filter((item) => typeSet.has(item.type)) : items;

  const sorted = filtered.sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());
  const paged = sorted.slice(offset, offset + limit + 1);
  const hasMore = paged.length > limit;

  return {
    items: paged.slice(0, limit),
    pagination: {
      limit,
      offset,
      hasMore,
    },
  };
}
