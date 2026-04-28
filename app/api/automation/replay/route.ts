import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { replayAutomationEvent } from '../../../../lib/automation/events.js';
import { ensureRouteConfigFromEnv } from '../../../../lib/config/route.js';
import { AutomationReplaySchema } from '../../../../lib/schemas/automation.js';
import { parseJsonBody } from '../../../../lib/validation.js';
import { requireAutomationToken } from '../_auth.js';

export async function POST(request: NextRequest): Promise<NextResponse> {
  ensureRouteConfigFromEnv(process.env);

  const auth = requireAutomationToken(request);
  if (auth.ok === false) return auth.response;

  const parsed = await parseJsonBody(request, AutomationReplaySchema);
  if (parsed.ok === false) return parsed.response;

  const result = await replayAutomationEvent(
    parsed.data.automationEventId,
    parsed.data.classifierVersion
  );
  if (result === null) {
    return NextResponse.json({ error: 'automation_event_not_found' }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    automationEventId: result.event.id,
    outputHash: result.outputHash,
    matches: result.matches,
    reason: result.reason,
  });
}
