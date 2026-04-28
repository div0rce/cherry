import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import {
  GithubStatusRetryNotFoundError,
  retryGithubStatus,
} from '../../../../../../lib/automation/github-status.js';
import { ensureRouteConfigFromEnv } from '../../../../../../lib/config/route.js';
import { GithubStatusRetrySchema } from '../../../../../../lib/schemas/automation.js';
import { parseJsonBody } from '../../../../../../lib/validation.js';
import { requireAutomationToken } from '../../../_auth.js';

export async function POST(request: NextRequest): Promise<NextResponse> {
  ensureRouteConfigFromEnv(process.env);

  const auth = requireAutomationToken(request);
  if (auth.ok === false) return auth.response;

  const parsed = await parseJsonBody(request, GithubStatusRetrySchema);
  if (parsed.ok === false) return parsed.response;

  try {
    const result = await retryGithubStatus(parsed.data, {
      githubToken: process.env['GITHUB_TOKEN'] ?? '',
    });
    return NextResponse.json({
      ok: true,
      retried: result.retried,
      statusCheck: result.statusCheck,
    });
  } catch (error: unknown) {
    if (error instanceof GithubStatusRetryNotFoundError) {
      return NextResponse.json({ error: 'github_status_not_found' }, { status: 404 });
    }
    const statusCheck = (error as { statusCheck?: unknown }).statusCheck;
    const message = error instanceof Error ? error.message : 'github_status_retry_failed';
    const status = /forbidden Cherry finance endpoint|Unsupported GitHub status context/.test(
      message
    )
      ? 400
      : 502;
    return NextResponse.json(
      {
        ok: false,
        error: message,
        statusCheck,
      },
      { status }
    );
  }
}
