import { NextResponse } from 'next/server';
import { resolveUserContext } from '../../../../lib/user-context.js';
import { getAutopilotPrereqs } from '../../../../lib/adapters/runtime/autopilot-prereqs.js';
import { getFirstMissingPrereq } from '../../../../lib/autopilot/prereq-types.js';
import { auth } from '../../../../lib/auth.js';

export async function GET(): Promise<NextResponse> {
  const userContext = await resolveUserContext({
    getSession: auth,
    requireAuth: true,
    allowLabDemo: true,
  });
  const prereqs = await getAutopilotPrereqs(userContext.userId);
  const missing = getFirstMissingPrereq(prereqs);

  return NextResponse.json({ prereqs, missing });
}
