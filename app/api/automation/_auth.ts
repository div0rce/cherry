import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getStandardBearerHeader } from '../../../lib/http/bearer-token.js';

export type AutomationAuthResult = { ok: true } | { ok: false; response: NextResponse };

export function requireAutomationToken(request: NextRequest): AutomationAuthResult {
  const expected = process.env['CHERRY_AUTOMATION_TOKEN'];
  if (typeof expected !== 'string' || expected.trim().length === 0) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'automation_token_not_configured' },
        { status: 503 }
      ),
    };
  }

  const bearerHeader = getStandardBearerHeader(request.headers);
  const headerToken = request.headers.get('x-cherry-automation-token');
  const bearerToken =
    bearerHeader !== null && bearerHeader.startsWith('Bearer ')
      ? bearerHeader.slice('Bearer '.length)
      : null;
  const provided = bearerToken ?? headerToken;
  if (provided !== expected) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  return { ok: true };
}
