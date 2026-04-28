import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { postGithubStatus } from '../../../../../lib/automation/github-status.js';
import { ensureRouteConfigFromEnv } from '../../../../../lib/config/route.js';
import { GithubStatusPostSchema } from '../../../../../lib/schemas/automation.js';
import { parseJsonBody } from '../../../../../lib/validation.js';
import { requireAutomationToken } from '../../_auth.js';

export async function POST(request: NextRequest): Promise<NextResponse> {
  ensureRouteConfigFromEnv(process.env);

  const auth = requireAutomationToken(request);
  if (auth.ok === false) return auth.response;

  const parsed = await parseJsonBody(request, GithubStatusPostSchema);
  if (parsed.ok === false) return parsed.response;

  try {
    const result = await postGithubStatus(parsed.data, {
      githubToken: process.env['GITHUB_TOKEN'] ?? '',
    });
    return NextResponse.json({
      ok: true,
      posted: result.posted,
      idempotent: result.idempotent,
      statusCheckId: result.statusCheck.id,
    });
  } catch (error: unknown) {
    const statusCheck = (error as { statusCheck?: { id?: string } }).statusCheck;
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'github_status_failed',
        statusCheckId: statusCheck?.id,
      },
      { status: 502 }
    );
  }
}
