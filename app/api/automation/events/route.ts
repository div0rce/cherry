import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { AutomationEventIngestSchema } from '../../../../lib/schemas/automation.js';
import {
  AutomationEventIdempotencyConflictError,
  storeAutomationEvent,
} from '../../../../lib/automation/events.js';
import { ensureRouteConfigFromEnv } from '../../../../lib/config/route.js';
import { parseJsonBody } from '../../../../lib/validation.js';
import { requireAutomationToken } from '../_auth.js';

export async function POST(request: NextRequest): Promise<NextResponse> {
  ensureRouteConfigFromEnv(process.env);

  const auth = requireAutomationToken(request);
  if (auth.ok === false) return auth.response;

  const parsed = await parseJsonBody(request, AutomationEventIngestSchema);
  if (parsed.ok === false) return parsed.response;

  let result: Awaited<ReturnType<typeof storeAutomationEvent>>;
  try {
    result = await storeAutomationEvent(parsed.data);
  } catch (error: unknown) {
    if (error instanceof AutomationEventIdempotencyConflictError) {
      return NextResponse.json(
        { error: 'automation_event_idempotency_conflict' },
        { status: 409 }
      );
    }
    throw error;
  }

  return NextResponse.json({
    ok: true,
    created: result.created,
    automationEventId: result.event.id,
    outputHash: result.event.outputHash,
  });
}
