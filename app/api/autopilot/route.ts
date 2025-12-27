import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '../../../lib/prisma';
import { getAutopilotDecisionForUserSwipe } from '../../../lib/engine';
import { resolveUserContext } from '../../../lib/user-context';
import { logGuardrailEvent } from '../../../lib/log';
import { parseJsonBody } from '../../../lib/validation';
import { buildPrismaWorld } from '../../../lib/adapters/runtime/world.prisma';
import { asAppError, isUnauthorized } from '../../../lib/errors';

const AutopilotRequestSchema = z
  .object({
    merchant: z.string().trim().min(1),
    amount: z.number().positive(),
  })
  .strict();

export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestNow = new Date();
  const requestNowMs = requestNow.getTime();
  const requestTimestamp = requestNow.toISOString();
  let userId: string | null = null;
  try {
    const context = await resolveUserContext({ requireAuth: true, allowLabDemo: true });
    userId = context.userId;

    const parsed = await parseJsonBody(request, AutopilotRequestSchema);
    if (!parsed.ok) {
      logGuardrailEvent({
        surface: 'autopilot',
        userId,
        kind: 'INPUT_INVALID',
        severity: 'soft',
        timestamp: requestTimestamp,
        timestampSource: 'boundary',
      });
      return NextResponse.json({ message: 'Invalid request' }, { status: parsed.response.status });
    }

    const { merchant, amount } = parsed.data;
    const amountCents = Math.round(amount * 100);
    if (!Number.isFinite(amountCents) || amountCents <= 0) {
      logGuardrailEvent({
        surface: 'autopilot',
        userId,
        kind: 'INPUT_INVALID',
        severity: 'soft',
        detail: { field: 'amount' },
        timestamp: requestTimestamp,
        timestampSource: 'boundary',
      });
      return NextResponse.json({ message: 'Amount must be positive.' }, { status: 400 });
    }

    const cards = await prisma.card.findMany({
      where: { userId },
      select: { id: true, nickname: true },
      orderBy: { createdAt: 'asc' },
    });
    const cardUniverseIds = cards.map((card) => card.id);
    const world = buildPrismaWorld();

    const decision = await getAutopilotDecisionForUserSwipe(world, {
      userId,
      merchant: merchant.trim(),
      amountCents,
      cardUniverseIds,
      nowMs: requestNowMs,
    });

    const cardName =
      decision.cardId !== null
        ? cards.find((card) => card.id === decision.cardId)?.nickname ?? null
        : null;

    const rationale =
      decision.kind === 'OK'
        ? decision.userFacingMessage
        : 'No specific recommendation available. You can still choose any card.';

    let bucketDelta: { name: string | null; limitCents: number | null; remainingCents: number | null } | null =
      null;
    if (decision.bucketDelta !== null) {
      const bucket = await prisma.bucket.findUnique({
        where: { id: decision.bucketDelta.bucketId, userId },
        select: { name: true, budgetAmount: true },
      });
      bucketDelta = {
        name: bucket?.name ?? null,
        limitCents: bucket?.budgetAmount ?? null,
        remainingCents: decision.bucketDelta.newRemainingCents ?? null,
      };
    }

    return NextResponse.json({
      cardName,
      cardId: decision.cardId,
      rationale,
      savingsDollars: (decision.expectedMonetaryBenefitCents ?? 0) / 100,
      bucketDelta,
    });
  } catch (err: unknown) {
    const appError = asAppError(err);
    if (isUnauthorized(appError)) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    logGuardrailEvent({
      surface: 'autopilot',
      userId,
      kind: 'ENGINE_ERROR',
      severity: 'hard',
      detail: { message: appError.message },
      timestamp: requestTimestamp,
      timestampSource: 'boundary',
    });
    return NextResponse.json({ message: 'Failed to fetch recommendation' }, { status: 500 });
  }
}
