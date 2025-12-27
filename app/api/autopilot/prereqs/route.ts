import { NextResponse } from 'next/server';
import { resolveUserContext } from '../../../../lib/user-context';
import { getAutopilotPrereqs } from '../../../../lib/adapters/runtime/autopilot-prereqs';
import { getFirstMissingPrereq } from '../../../../lib/autopilot/prereq-types';

export async function GET(): Promise<NextResponse> {
  const userContext = await resolveUserContext({ requireAuth: true, allowLabDemo: true });
  const prereqs = await getAutopilotPrereqs(userContext.userId);
  const missing = getFirstMissingPrereq(prereqs);

  return NextResponse.json({ prereqs, missing });
}
