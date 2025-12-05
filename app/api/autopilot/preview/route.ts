import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAutopilotDecisionForUserSwipe } from '@/lib/engine';
import { AutopilotDecisionSchema, AutopilotPreviewRequest } from '@/lib/schemas/autopilot';
import { logGuardrailEvent, logInvariantViolation } from '@/lib/log';
import { parseJsonBody } from '@/lib/validation';
import { resolveUserContext } from '@/lib/user-context';

export async function POST(request: NextRequest): Promise<NextResponse> {
  let userId: string | null = null;
  try {
    const userContext = await resolveUserContext({ requireAuth: true, allowLabDemo: true });
    userId = userContext.userId;
    const currentUserId = userContext.userId;

    const parsed = await parseJsonBody(request, AutopilotPreviewRequest);
    if (!parsed.ok) {
      logGuardrailEvent({
        surface: 'autopilot',
        userId,
        kind: 'INPUT_INVALID',
        severity: 'hard',
        reason: 'INVALID_PAYLOAD',
      });
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const body = parsed.data;
    const cardUniverseIds = (
      await prisma.card.findMany({
        where: { userId: currentUserId },
        select: { id: true },
        orderBy: { createdAt: 'asc' },
      })
    ).map((card) => card.id);

    const decision = await getAutopilotDecisionForUserSwipe({
      userId: currentUserId,
      merchant: body.merchant,
      amountCents: body.amountCents,
      cardUniverseIds,
    });

    if (decision.kind === 'BLOCKED') {
      logGuardrailEvent({
        surface: 'autopilot',
        userId,
        kind: 'DECISION_BLOCKED',
        severity: 'hard',
        detail: { reasonCode: decision.reasonCode },
      });
    }
    if (decision.kind === 'FALLBACK') {
      logGuardrailEvent({
        surface: 'autopilot',
        userId,
        kind: 'ENGINE_ERROR',
        severity: 'soft',
        reason: decision.reasonCode,
      });
    }

    const validatedDecision = AutopilotDecisionSchema.safeParse(decision);
    if (!validatedDecision.success) {
      logInvariantViolation({
        surface: 'autopilot',
        detail: 'Autopilot decision validation failed in preview',
        data: validatedDecision.error.format(),
      });
      return NextResponse.json({ error: 'Failed to evaluate autopilot' }, { status: 500 });
    }

    return NextResponse.json(validatedDecision.data);
  } catch (err) {
    if (err instanceof Error && err.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    logInvariantViolation({
      surface: 'autopilot',
      detail: 'Autopilot preview failed unexpectedly',
      data: { userId, error: err instanceof Error ? err.message : 'UNKNOWN_ERROR' },
    });
    return NextResponse.json({ error: 'Failed to evaluate autopilot' }, { status: 500 });
  }
}
