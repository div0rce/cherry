import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
// NOTE: DailyState contract is type-locked. See docs/daily-state.md.
// Do not change semantics without bumping engineVersion.
import { withUser } from '../../../../lib/with-user.js';
import { parseJsonBody } from '../../../../lib/validation.js';
import { DailyStateSource } from '@prisma/client';
import { runDailyForUser } from '../../../../lib/daily-state/runDailyForUser.js';

const RunDailySchema = z
  .object({
    userId: z.string().min(1).optional(),
    date: z.string().optional(),
  })
  .strict();

export async function POST(request: NextRequest): Promise<NextResponse> {
  return withUser(request, async (userIdFromContext, req) => {
    if (process.env['CHERRY_DAILYSTATE_CRON_ENABLED'] !== 'true') {
      return NextResponse.json({ error: 'daily_state_disabled' }, { status: 403 });
    }

    const parsed = await parseJsonBody(req, RunDailySchema);
    if (parsed.ok !== true) return parsed.response;

    const targetUserId = parsed.data.userId ?? userIdFromContext;
    const targetDateRaw = parsed.data.date;
    const targetDate =
      typeof targetDateRaw === 'string' && targetDateRaw.length > 0
        ? new Date(targetDateRaw)
        : new Date();
    if (!Number.isFinite(targetDate.getTime())) {
      return NextResponse.json({ error: 'invalid_date' }, { status: 400 });
    }

    const result = await runDailyForUser({
      userId: targetUserId,
      date: targetDate,
      source: DailyStateSource.MANUAL,
    });

    return NextResponse.json({
      userId: targetUserId,
      date: targetDate,
      status: result.status,
      inputsVersion: result.inputsVersion,
      engineVersion: result.engineVersion,
    });
  });
}
