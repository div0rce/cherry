import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
// NOTE: DailyState contract is type-locked. See docs/daily-state.md.
// Do not change semantics without bumping engineVersion.
import { withUser } from '@/lib/with-user';
import { parseJsonBody } from '@/lib/validation';
import { prisma } from '@/lib/prisma';
import { ensureBucketFresh } from '@/lib/buckets/ensure-fresh';
import { toBucketRuntime } from '@/lib/buckets-runtime';
import { createHash } from 'crypto';
import { DailyStateSource, DailyStateStatus, Prisma } from '@prisma/client';

const RunDailySchema = z
  .object({
    userId: z.string().min(1).optional(),
    date: z.string().optional(),
  })
  .strict();

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function normalizeUtcDate(raw?: string): Date | null {
  if (raw === undefined) return startOfUtcDay(new Date());
  const parsed = new Date(raw);
  if (!Number.isFinite(parsed.getTime())) return null;
  return startOfUtcDay(parsed);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  return withUser(request, async (userIdFromContext, req) => {
    if (process.env['CHERRY_DAILYSTATE_CRON_ENABLED'] !== 'true') {
      return NextResponse.json({ error: 'daily_state_disabled' }, { status: 403 });
    }

    const parsed = await parseJsonBody(req, RunDailySchema);
    if (!parsed.ok) return parsed.response;

    const targetUserId = parsed.data.userId ?? userIdFromContext;
    const targetDate = normalizeUtcDate(parsed.data.date);
    if (!targetDate) {
      return NextResponse.json({ error: 'invalid_date' }, { status: 400 });
    }

    const now = new Date();
    const source: DailyStateSource = DailyStateSource.MANUAL;

    const existing = await prisma.dailyState.findUnique({
      where: { userId_date: { userId: targetUserId, date: targetDate } },
    });

    try {
      const buckets = await prisma.bucket.findMany({
        where: { userId: targetUserId },
        orderBy: { createdAt: 'asc' },
      });

      const freshBuckets = (
        await Promise.all(
          buckets.map(async (bucket) => {
            const fresh = await ensureBucketFresh(bucket.id, now);
            return fresh && fresh.userId === targetUserId ? fresh : null;
          })
        )
      ).filter((b): b is NonNullable<typeof b> => b !== null);

      const runtimeBuckets = freshBuckets.map(toBucketRuntime);
      const cards = await prisma.card.findMany({
        where: { userId: targetUserId },
        include: { rewardRules: true },
      });

      const ledgerPending = await prisma.cherryPointLedger.aggregate({
        where: { userId: targetUserId, status: 'PENDING' },
        _sum: { points: true },
      });

      const sessionsPendingVerification = await prisma.recommendationSession.count({
        where: {
          userId: targetUserId,
          verificationStatus: 'PENDING',
        },
      });

      const exhaustedCategories = runtimeBuckets
        .filter((b) => (b.remainingCents ?? 0) <= 0)
        .map((b) => b.category);

      const minRemaining = runtimeBuckets.reduce<number>(
        (acc, b) => Math.min(acc, b.remainingCents ?? acc),
        runtimeBuckets.length > 0 ? Number.POSITIVE_INFINITY : 0
      );

      const remainingTotal = runtimeBuckets.reduce<number>(
        (acc, b) => acc + (b.remainingCents ?? 0),
        0
      );

      let status: DailyStateStatus = DailyStateStatus.INSUFFICIENT_DATA;
      if (runtimeBuckets.length === 0 || cards.length === 0) {
        status = DailyStateStatus.INSUFFICIENT_DATA;
      } else if (minRemaining <= 0) {
        status = DailyStateStatus.RISKY;
      } else if (minRemaining <= 2000) {
        status = DailyStateStatus.TIGHT;
      } else {
        status = DailyStateStatus.SAFE;
      }

      const nextRiskEvent =
        runtimeBuckets.length > 0
          ? {
              kind: 'BUCKET_PERIOD_END',
              at: runtimeBuckets
                .map((b) => b.periodEnd)
                .filter(Boolean)
                .sort((a, b) => a.getTime() - b.getTime())[0] ?? null,
            }
          : Prisma.JsonNull;

      const summary = {
        buckets: {
          remainingCents: remainingTotal,
          exhaustedCategories,
        },
        pointsPending: ledgerPending._sum.points ?? 0,
        sessionsPendingVerification,
      };

      const hash = createHash('sha256');
      hash.update(
        JSON.stringify({
          buckets: runtimeBuckets.map((b) => ({
            id: b.id,
            remainingCents: b.remainingCents,
            periodEnd: b.periodEnd?.toISOString() ?? null,
          })),
          cards: cards.map((c) => ({ id: c.id, rewardRules: c.rewardRules.length })),
          ledgerPending: summary.pointsPending,
          sessionsPendingVerification,
        })
      );
      const inputsVersion = hash.digest('hex');
      const engineVersion =
        process.env['VERCEL_GIT_COMMIT_SHA'] ??
        process.env['COMMIT_SHA'] ??
        process.env['NEXT_PUBLIC_SITE_VERSION'] ??
        null;

      const rank = (s: DailyStateStatus): number => {
        if (s === DailyStateStatus.SAFE) return 3;
        if (s === DailyStateStatus.TIGHT) return 2;
        if (s === DailyStateStatus.RISKY) return 1;
        return 0;
      };

      if (
        existing !== null &&
        existing.inputsVersion === inputsVersion &&
        rank(status) < rank(existing.status)
      ) {
        return NextResponse.json({
          id: existing.id,
          userId: existing.userId,
          date: existing.date,
          status: existing.status,
          computedAt: existing.computedAt,
          source: existing.source,
        });
      }

      const dailyState = await prisma.dailyState.upsert({
        where: { userId_date: { userId: targetUserId, date: targetDate } },
        update: {
          status,
          safeToSpendCents: Number.isFinite(minRemaining) ? Math.max(0, Math.floor(minRemaining)) : null,
          nextRiskEvent,
          summary,
          computedAt: now,
          source,
          engineVersion,
          inputsVersion,
          errors: null,
        },
        create: {
          userId: targetUserId,
          date: targetDate,
          status,
          safeToSpendCents: Number.isFinite(minRemaining) ? Math.max(0, Math.floor(minRemaining)) : null,
          nextRiskEvent,
          summary,
          computedAt: now,
          source,
          engineVersion,
          inputsVersion,
          errors: null,
        },
      });

      return NextResponse.json({
        id: dailyState.id,
        userId: dailyState.userId,
        date: dailyState.date,
        status: dailyState.status,
        computedAt: dailyState.computedAt,
        source: dailyState.source,
      });
    } catch (error) {
      const fallbackStatus: DailyStateStatus = DailyStateStatus.INSUFFICIENT_DATA;
      const dailyState = await prisma.dailyState.upsert({
        where: { userId_date: { userId: targetUserId, date: targetDate } },
        update: {
          status: fallbackStatus,
          computedAt: now,
          source,
          errors: error instanceof Error ? error.message : 'unknown_error',
        },
        create: {
          userId: targetUserId,
          date: targetDate,
          status: fallbackStatus,
          computedAt: now,
          source,
          engineVersion: null,
          inputsVersion: null,
          summary: Prisma.JsonNull,
          safeToSpendCents: null,
          nextRiskEvent: Prisma.JsonNull,
          errors: error instanceof Error ? error.message : 'unknown_error',
        },
      });

      return NextResponse.json({
        id: dailyState.id,
        userId: dailyState.userId,
        date: dailyState.date,
        status: dailyState.status,
        computedAt: dailyState.computedAt,
        source: dailyState.source,
        error: 'insufficient_data',
      });
    }
  });
}
