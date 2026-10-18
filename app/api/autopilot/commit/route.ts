import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { commitAutopilotDecision, commitAutopilotDecisionV2 } from '../../../../lib/autopilot/service.js';
import { AutopilotCommitInputSchema, AutopilotServiceError } from '../../../../lib/autopilot/types.js';
import { logGuardrailEvent, logInvariantViolation } from '../../../../lib/log.js';
import { parseJsonBody } from '../../../../lib/validation.js';
import { resolveUserContext } from '../../../../lib/user-context.js';
import { buildPrismaWorld } from '../../../../lib/adapters/runtime/world.prisma.js';
import { asAppError, isUnauthorized } from '../../../../lib/errors.js';
import { auth } from '../../../../lib/auth.js';

const AUTOPILOT_COMMIT_V2_ENABLED = process.env['AUTOPILOT_COMMIT_V2'] === 'true';

function classifyServiceError(caught: AutopilotServiceError) {
  if (caught.code === 'DECISION_BLOCKED' || caught.code === 'CARD_MISMATCH') {
    return { kind: 'DECISION_BLOCKED', severity: 'hard' } as const;
  }
  if (caught.status >= 500) {
    return { kind: 'ENGINE_ERROR', severity: 'soft' } as const;
  }
  return { kind: 'INPUT_INVALID', severity: 'hard' } as const;
}

function serviceErrorResponse(
  caught: AutopilotServiceError,
  message: string,
  userId: string | null,
  requestTimestamp: string
): NextResponse {
  const { kind, severity } = classifyServiceError(caught);
  logGuardrailEvent({
    surface: 'autopilot',
    userId,
    kind,
    severity,
    reason: caught.code,
    timestamp: requestTimestamp,
    timestampSource: 'boundary',
  });
  return NextResponse.json({ error: message, code: caught.code }, { status: caught.status });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestNow = new Date();
  const requestTimestamp = requestNow.toISOString();
  let userId: string | null = null;
  try {
    const userContext = await resolveUserContext({
      getSession: auth,
      requireAuth: true,
      allowLabDemo: true,
    });
    userId = userContext.userId;

    const parsed = await parseJsonBody(request, AutopilotCommitInputSchema);
    if (parsed.ok !== true) {
      logGuardrailEvent({
        surface: 'autopilot',
        userId,
        kind: 'INPUT_INVALID',
        severity: 'hard',
        reason: 'INVALID_PAYLOAD',
        timestamp: requestTimestamp,
        timestampSource: 'boundary',
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
      return serviceErrorResponse(caught, appError.message, userId, requestTimestamp);
    }

    if (isUnauthorized(appError)) {
      return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });
    }
    logInvariantViolation({
      surface: 'autopilot',
      detail: 'Autopilot commit failed unexpectedly',
      data: { userId, error: appError.message },
      timestamp: requestTimestamp,
    });
    return NextResponse.json(
      { error: 'Failed to commit swipe', code: 'AUTOPILOT_COMMIT_UNEXPECTED' },
      { status: 500 }
    );
  }
}
