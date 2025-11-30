/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import type {
  CherryPointLedger,
  Prisma,
  RecommendationSession,
  RecommendationSource,
  RewardCategory,
} from '@prisma/client';
import { prisma } from '@/lib/prisma';

export type SessionDisplayStatus = 'OPEN' | 'EXPIRED' | 'CONFIRMED_PENDING' | 'CONFIRMED_POSTED';

export interface SessionSummary {
  id: string;
  createdAt: Date;
  expiresAt: Date | null;
  amountCents: number;
  category: RewardCategory;
  verdict: RecommendationSession['verdict'];
  source: RecommendationSource;
  merchantName: string | null;
  bucketName: string | null;
  pointsOffered: number;
  pointsPending: number;
  pointsPosted: number;
  displayStatus: SessionDisplayStatus;
}

export interface SessionListFilters {
  limit?: number;
  offset?: number;
  verdict?: RecommendationSession['verdict'][] | null;
  from?: Date | null;
  to?: Date | null;
  source?: RecommendationSource[] | null;
  status?: 'all' | 'active' | 'expired' | 'confirmed';
}

function computePoints(ledgerEntries: CherryPointLedger[]) {
  const pending =
    ledgerEntries
      ?.filter((entry) => entry.status === 'PENDING')
      .reduce((acc, entry) => acc + entry.points, 0) ?? 0;

  const posted =
    ledgerEntries
      ?.filter((entry) => entry.status === 'POSTED')
      .reduce((acc, entry) => acc + entry.points, 0) ?? 0;

  const revoked =
    ledgerEntries
      ?.filter((entry) => entry.status === 'REVOKED')
      .reduce((acc, entry) => acc + entry.points, 0) ?? 0;

  return { pending, posted, revoked };
}

export function deriveDisplayStatus(
  session: RecommendationSession,
  ledgerEntries: CherryPointLedger[],
  now: Date
): SessionDisplayStatus {
  const { pending, posted } = computePoints(ledgerEntries);
  const isExpired = session.expiresAt ? session.expiresAt <= now : false;

  if (posted > 0) return 'CONFIRMED_POSTED';
  if (pending > 0) return 'CONFIRMED_PENDING';
  if (isExpired) return 'EXPIRED';
  return 'OPEN';
}

export async function fetchSessionSummaries(
  userId: string,
  filters: SessionListFilters = {}
): Promise<{ items: SessionSummary[]; hasMore: boolean; limit: number; offset: number }> {
  const limit = Math.min(filters.limit ?? 20, 100);
  const offset = Math.max(filters.offset ?? 0, 0);
  const now = new Date();

  const createdAtFilter: { gte?: Date; lte?: Date } = {};
  if (filters.from) createdAtFilter.gte = filters.from;
  if (filters.to) createdAtFilter.lte = filters.to;

  const where: Prisma.RecommendationSessionWhereInput = {
    userId,
    ...(Object.keys(createdAtFilter).length > 0 ? { createdAt: createdAtFilter } : {}),
    ...(filters.source && filters.source.length > 0 ? { source: { in: filters.source } } : {}),
    ...(filters.verdict && filters.verdict.length > 0 ? { verdict: { in: filters.verdict } } : {}),
  };

  const sessions = (await prisma.recommendationSession.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    skip: offset,
    take: limit + 1,
    include: {
      ledgerEntries: true,
      recommendedBucket: { select: { name: true } },
    },
  })) as unknown as (RecommendationSession & {
    ledgerEntries: CherryPointLedger[];
    recommendedBucket?: { name: string } | null;
  })[];

  const mapped = sessions.map((session) => {
    const { pending, posted } = computePoints(session.ledgerEntries ?? []);
    const displayStatus = deriveDisplayStatus(session, session.ledgerEntries ?? [], now);
    const summary: SessionSummary = {
      id: session.id,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
      amountCents: session.amountCents,
      category: session.category,
      verdict: session.verdict,
      source: session.source,
      merchantName: session.merchantName,
      bucketName: session.recommendedBucket?.name ?? null,
      pointsOffered: session.cherryPointsOffered ?? 0,
      pointsPending: pending,
      pointsPosted: posted,
      displayStatus,
    };
    return summary;
  });

  const statusFilter = filters.status ?? 'all';
  const filtered =
    statusFilter === 'all'
      ? mapped
      : mapped.filter((s) => {
          if (statusFilter === 'expired') return s.displayStatus === 'EXPIRED';
          if (statusFilter === 'confirmed')
            return s.displayStatus === 'CONFIRMED_PENDING' || s.displayStatus === 'CONFIRMED_POSTED';
          if (statusFilter === 'active') return s.displayStatus === 'OPEN';
          return true;
        });

  const hasMore = filtered.length > limit;
  return {
    items: filtered.slice(0, limit),
    hasMore,
    limit,
    offset,
  };
}
