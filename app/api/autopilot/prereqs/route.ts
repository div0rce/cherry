import { NextResponse } from 'next/server';
import { resolveUserContext } from '../../../../lib/user-context.js';
import { getAutopilotPrereqs } from '../../../../lib/adapters/runtime/autopilot-prereqs.js';
import { getFirstMissingPrereq } from '../../../../lib/autopilot/prereq-types.js';
import { auth } from '../../../../lib/auth.js';
import { withAuthErrors } from '../../../../lib/with-user.js';

async function handleGET(): Promise<NextResponse> {
  const userContext = await resolveUserContext({
    getSession: auth,
    requireAuth: true,
    allowLabDemo: true,
  });
  const prereqs = await getAutopilotPrereqs(userContext.userId);
  const missing = getFirstMissingPrereq(prereqs);

  return NextResponse.json({ prereqs, missing });
}

export const GET = withAuthErrors(handleGET);
