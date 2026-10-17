import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
// NOTE: DailyState is advisory: it never touches sessions or ledger, but it does roll buckets
// into their current period and may record AlertEvents (see lib/daily-state/runDailyForUser.ts).
import { DailyStateSource } from '@prisma/client';
import { prisma } from '../../../../lib/prisma.js';
import { isFutureUtcDay, runDailyForUser } from '../../../../lib/daily-state/runDailyForUser.js';
import { logInfo, logError } from '../../../../lib/logger.js';
import { asAppError } from '../../../../lib/errors.js';
import { parseJsonBody } from '../../../../lib/validation.js';
import { hasBearerSecret } from '../../../../lib/identity/bearer-secret.js';

const RunAllSchema = z
  .object({
    date: z.string().optional(),
    batchSize: z.number().int().positive().max(500).optional(),
  })
  .strict();

// This job touches every user, so a user session is not enough: callers must present the
// CRON_SECRET bearer header that Vercel Cron sends. Fails closed when the secret is unset or
// shorter than 32 characters.
const MIN_CRON_SECRET_LENGTH = 32;

function hasCronSecret(request: NextRequest): boolean {
  return hasBearerSecret(request.headers, process.env['CRON_SECRET'], MIN_CRON_SECRET_LENGTH);
}

function rejectUnlessAllowed(request: NextRequest): NextResponse | null {
  if (!hasCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (process.env['CHERRY_DAILYSTATE_CRON_ENABLED'] !== 'true') {
    return NextResponse.json({ error: 'daily_state_disabled' }, { status: 403 });
  }
  return null;
}

// Vercel Cron calls GET with no body: run for today with the default batch size.
export async function GET(request: NextRequest): Promise<NextResponse> {
  return rejectUnlessAllowed(request) ?? runAll({});
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const rejected = rejectUnlessAllowed(request);
  if (rejected !== null) return rejected;
  const parsed = await parseJsonBody(request, RunAllSchema);
  if (parsed.ok !== true) return parsed.response;
  return runAll(parsed.data);
}

async function runAll(body: z.infer<typeof RunAllSchema>): Promise<NextResponse> {
  const nowMs = Date.now();
  const targetDate =
    typeof body.date === 'string' && body.date.length > 0 ? new Date(body.date) : new Date(nowMs);
  if (!Number.isFinite(targetDate.getTime())) {
    return NextResponse.json({ error: 'invalid_date' }, { status: 400 });
  }
  if (isFutureUtcDay(targetDate, nowMs)) {
    return NextResponse.json({ error: 'future_date' }, { status: 400 });
  }
  const batchSize = body.batchSize ?? 100;
  const startedAt = nowMs;

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
          nowMs,
        });
        succeeded += 1;
      } catch (error: unknown) {
        failed += 1;
        const appError = asAppError(error);
        logError('daily_state_user_failed', { userId: user.id, err: appError });
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
}
