import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
// NOTE: DailyState pipeline is advisory-only. No auth/spend/alerts/UI coupling here.
import { withUser } from '../../../../lib/with-user.js';
import { DailyStateSource } from '@prisma/client';
import { prisma } from '../../../../lib/prisma.js';
import { runDailyForUser } from '../../../../lib/daily-state/runDailyForUser.js';
import { logInfo, logError } from '../../../../lib/logger.js';
import { asError } from '../../../../lib/errors.js';
import { parseJsonBody } from '../../../../lib/validation.js';

const RunAllSchema = z
  .object({
    date: z.string().optional(),
    batchSize: z.number().int().positive().max(500).optional(),
  })
  .strict();

export async function POST(request: NextRequest): Promise<NextResponse> {
  return withUser(request, async (_userId, req) => {
    if (process.env['CHERRY_DAILYSTATE_CRON_ENABLED'] !== 'true') {
      return NextResponse.json({ error: 'daily_state_disabled' }, { status: 403 });
    }

    const parsed = await parseJsonBody(req, RunAllSchema);
    if (!parsed.ok) return parsed.response;
    const body: z.infer<typeof RunAllSchema> = parsed.data;

    const targetDate =
      typeof body.date === 'string' && body.date.length > 0 ? new Date(body.date) : new Date();
    if (!Number.isFinite(targetDate.getTime())) {
      return NextResponse.json({ error: 'invalid_date' }, { status: 400 });
    }
    const batchSize = body.batchSize ?? 100;
    const startedAt = Date.now();

    let cursor: string | null = null;
    let processed = 0;
    let succeeded = 0;
    let failed = 0;

    for (;;) {
      const users: Array<{ id: string }> = await prisma.user.findMany({
        select: { id: true },
        orderBy: { id: 'asc' },
        take: batchSize,
        ...(cursor !== null ? { skip: 1, cursor: { id: cursor } } : {}),
      });

      if (users.length === 0) break;

      for (const user of users) {
        try {
          await runDailyForUser({
            userId: user.id,
            date: targetDate,
            source: DailyStateSource.NIGHTLY,
          });
          succeeded += 1;
        } catch (error: unknown) {
          failed += 1;
          asError(error);
          logError('daily_state_user_failed', { userId: user.id, err: error });
        } finally {
          processed += 1;
        }
      }

      const lastUser: { id: string } | null =
        users.length > 0 ? users[users.length - 1]! : null;
      cursor = lastUser === null ? null : lastUser.id;
    }

    const durationMs = Date.now() - startedAt;
    logInfo('daily_state_nightly_complete', {
      date: targetDate.toISOString(),
      processed,
      succeeded,
      failed,
      durationMs,
    });

    return NextResponse.json({
      ok: true,
      processed,
      succeeded,
      failed,
      durationMs,
    });
  });
}
