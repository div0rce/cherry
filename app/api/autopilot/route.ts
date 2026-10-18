import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '../../../lib/prisma.js';
import { getAutopilotDecisionForUserSwipe } from '../../../lib/autopilot/engine-decision.js';
import { resolveUserContext } from '../../../lib/user-context.js';
import { logGuardrailEvent } from '../../../lib/log.js';
import { parseJsonBody } from '../../../lib/validation.js';
import { buildPrismaWorld } from '../../../lib/adapters/runtime/world.prisma.js';
import { asAppError, isUnauthorized } from '../../../lib/errors.js';
import { auth } from '../../../lib/auth.js';

const AutopilotRequestSchema = z
  .object({
    merchant: z.string().trim().min(1),
    amount: z.number().positive(),
  })
  .strict();

type SwipeDecision = Awaited<ReturnType<typeof getAutopilotDecisionForUserSwipe>>;

function logInputInvalid(userId: string, timestamp: string, detail?: { field: string }): void {
  logGuardrailEvent({
    surface: 'autopilot',
    userId,
    kind: 'INPUT_INVALID',
    severity: 'soft',
    ...(detail !== undefined ? { detail } : {}),
    timestamp,
    timestampSource: 'boundary',
  });
}

function isPositiveFinite(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

function resolveCardName(
  decision: SwipeDecision,
  cards: Array<{ id: string; nickname: string | null }>
): string | null {
  if (decision.cardId === null) return null;
  return cards.find((card) => card.id === decision.cardId)?.nickname ?? null;
}

function resolveRationale(decision: SwipeDecision): string {
  return decision.kind === 'OK'
    ? decision.userFacingMessage
    : 'No specific recommendation available. You can still choose any card.';
}

function centsToDollarsOrNull(cents: number | null | undefined): number | null {
  return cents == null ? null : cents / 100;
}

async function resolveBucketDelta(
  decision: SwipeDecision,
  userId: string
): Promise<{ name: string | null; limitCents: number | null; remainingCents: number | null } | null> {
  if (decision.bucketDelta === null) return null;
  const bucket = await prisma.bucket.findUnique({
    where: { id: decision.bucketDelta.bucketId, userId },
    select: { name: true, budgetAmount: true },
  });
  return {
    name: bucket?.name ?? null,
    limitCents: bucket?.budgetAmount ?? null,
    remainingCents: decision.bucketDelta.newRemainingCents ?? null,
  };
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestNow = new Date();
  const requestNowMs = requestNow.getTime();
  const requestTimestamp = requestNow.toISOString();
  let userId: string | null = null;
  try {
    const context = await resolveUserContext({
      getSession: auth,
      requireAuth: true,
      allowLabDemo: true,
    });
    userId = context.userId;

    const parsed = await parseJsonBody(request, AutopilotRequestSchema);
    if (parsed.ok !== true) {
      logInputInvalid(userId, requestTimestamp);
      return NextResponse.json({ message: 'Invalid request' }, { status: parsed.response.status });
    }

    const { merchant, amount } = parsed.data;
    const amountCents = Math.round(amount * 100);
    if (!isPositiveFinite(amountCents)) {
      logInputInvalid(userId, requestTimestamp, { field: 'amount' });
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

    const bucketDelta = await resolveBucketDelta(decision, userId);

    return NextResponse.json({
      cardName: resolveCardName(decision, cards),
      cardId: decision.cardId,
      rationale: resolveRationale(decision),
      savingsDollars: centsToDollarsOrNull(decision.expectedMonetaryBenefitCents),
      issuerPointsDelta: decision.expectedPointsDelta,
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
