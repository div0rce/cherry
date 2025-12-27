import { NextRequest, NextResponse } from 'next/server';
import { commitAutopilotDecision, commitAutopilotDecisionV2 } from '../../../../lib/autopilot/service';
import { AutopilotCommitInputSchema, AutopilotServiceError } from '../../../../lib/autopilot/types';
import { logGuardrailEvent, logInvariantViolation } from '../../../../lib/log';
import { parseJsonBody } from '../../../../lib/validation';
import { resolveUserContext } from '../../../../lib/user-context';
import { buildPrismaWorld } from '../../../../lib/adapters/runtime/world.prisma';
import { asAppError, isUnauthorized } from '../../../../lib/errors';

const AUTOPILOT_COMMIT_V2_ENABLED = process.env['AUTOPILOT_COMMIT_V2'] === 'true';

export async function POST(request: NextRequest): Promise<NextResponse> {
  let userId: string | null = null;
  try {
    const userContext = await resolveUserContext({ requireAuth: true, allowLabDemo: true });
    userId = userContext.userId;
    // Boundary layer: wall-clock capture allowed; downstream must receive injected time.
    const requestNow = new Date();

    const parsed = await parseJsonBody(request, AutopilotCommitInputSchema);
    if (!parsed.ok) {
      logGuardrailEvent({
        surface: 'autopilot',
        userId,
        kind: 'INPUT_INVALID',
        severity: 'hard',
        reason: 'INVALID_PAYLOAD',
      });
      return parsed.response;
    }

    const world = buildPrismaWorld();
    const result = AUTOPILOT_COMMIT_V2_ENABLED
      ? await commitAutopilotDecisionV2(world, userContext.userId, parsed.data, { now: requestNow })
      : await commitAutopilotDecision(world, userContext.userId, parsed.data, { now: requestNow });

    return NextResponse.json(result, { status: 200 });
  } catch (caught: unknown) {
    const appError = asAppError(caught);
    if (caught instanceof AutopilotServiceError) {
      const kind =
        caught.code === 'DECISION_BLOCKED' || caught.code === 'CARD_MISMATCH'
          ? 'DECISION_BLOCKED'
          : caught.status >= 500
            ? 'ENGINE_ERROR'
            : 'INPUT_INVALID';
      const severity = kind === 'DECISION_BLOCKED' ? 'hard' : caught.status >= 500 ? 'soft' : 'hard';
      logGuardrailEvent({
        surface: 'autopilot',
        userId,
        kind,
        severity,
        reason: caught.code,
      });
      return NextResponse.json(
        { error: appError.message, code: caught.code },
        { status: caught.status }
      );
    }

    if (isUnauthorized(appError)) {
      return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });
    }
    logInvariantViolation({
      surface: 'autopilot',
      detail: 'Autopilot commit failed unexpectedly',
      data: { userId, error: appError.message },
    });
    return NextResponse.json(
      { error: 'Failed to commit swipe', code: 'AUTOPILOT_COMMIT_UNEXPECTED' },
      { status: 500 }
    );
  }
}
