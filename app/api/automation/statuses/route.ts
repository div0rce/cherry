import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import {
  isAllowedGithubStatusContext,
  listLatestGithubStatuses,
} from '../../../../lib/automation/github-status.js';
import { ensureRouteConfigFromEnv } from '../../../../lib/config/route.js';
import { requireAutomationToken } from '../_auth.js';

export async function GET(request: NextRequest): Promise<NextResponse> {
  ensureRouteConfigFromEnv(process.env);

  const auth = requireAutomationToken(request);
  if (auth.ok === false) return auth.response;

  const url = new URL(request.url);
  const repo = url.searchParams.get('repo') ?? undefined;
  const sha = url.searchParams.get('sha') ?? undefined;
  const contextParam = url.searchParams.get('context') ?? undefined;
  if (
    contextParam !== undefined &&
    isAllowedGithubStatusContext(contextParam) === false
  ) {
    return NextResponse.json({ error: 'invalid_status_context' }, { status: 400 });
  }

  const params: Parameters<typeof listLatestGithubStatuses>[0] = {};
  if (repo !== undefined) params.repo = repo;
  if (sha !== undefined) params.sha = sha;
  if (contextParam !== undefined) params.context = contextParam;
  const statuses = await listLatestGithubStatuses(params);
  return NextResponse.json({ ok: true, statuses });
}
