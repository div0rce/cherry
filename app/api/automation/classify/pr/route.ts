import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import {
  AutomationEventIdempotencyConflictError,
  classifyAndStorePrAutomation,
} from '../../../../../lib/automation/events.js';
import { ensureRouteConfigFromEnv } from '../../../../../lib/config/route.js';
import { PrAutomationClassifySchema } from '../../../../../lib/schemas/automation.js';
import { parseJsonBody } from '../../../../../lib/validation.js';
import { requireAutomationToken } from '../../_auth.js';

export async function POST(request: NextRequest): Promise<NextResponse> {
  ensureRouteConfigFromEnv(process.env);

  const auth = requireAutomationToken(request);
  if (auth.ok === false) return auth.response;

  const parsed = await parseJsonBody(request, PrAutomationClassifySchema);
  if (parsed.ok === false) return parsed.response;

  let result: Awaited<ReturnType<typeof classifyAndStorePrAutomation>>;
  try {
    result = await classifyAndStorePrAutomation(parsed.data);
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
    classifierOutput: result.classifierOutput,
  });
}
