import type { AutomationStatusCheck } from '@prisma/client';
import {
  createGithubStatusCheckRecord,
  findStatusCheckById,
  findStatusCheckByIdempotencyKey,
  listGithubStatusChecks,
  postGithubCommitStatus,
  updateGithubStatusCheckResponse,
} from '../adapters/runtime/automation-github-status.prisma.js';
import { buildAutomationIdempotencyKey } from './hash.js';

export const ALLOWED_GITHUB_STATUS_CONTEXTS = [
  'cherry/forbidden-change',
  'cherry/docs-drift',
  'cherry/risk-gate',
  'cherry/openclaw-policy',
] as const;

export type AllowedGithubStatusContext = (typeof ALLOWED_GITHUB_STATUS_CONTEXTS)[number];

export type GithubStatusInput = {
  repo: string;
  sha: string;
  context: AllowedGithubStatusContext;
  state: 'error' | 'failure' | 'pending' | 'success';
  description: string;
  targetUrl?: string | undefined;
  sourceWorkflow: string;
  automationEventId?: string | undefined;
  classifierVersion: string;
  outputHash: string;
};

export type GithubStatusPostOptions = {
  githubToken: string;
  apiBaseUrl?: string;
};

export type GithubStatusPostResult = {
  statusCheck: AutomationStatusCheck;
  posted: boolean;
  idempotent: boolean;
};

export type GithubStatusRetryInput = {
  id?: string | undefined;
  statusIdempotencyKey?: string | undefined;
};

export type GithubStatusRetryResult = {
  statusCheck: AutomationStatusCheck;
  retried: boolean;
};

export class GithubStatusRetryNotFoundError extends Error {
  constructor() {
    super('github_status_not_found');
    this.name = 'GithubStatusRetryNotFoundError';
  }
}

export function isAllowedGithubStatusContext(
  context: string
): context is AllowedGithubStatusContext {
  return ALLOWED_GITHUB_STATUS_CONTEXTS.includes(context as AllowedGithubStatusContext);
}

export function buildStatusIdempotencyKey(input: GithubStatusInput): string {
  return buildAutomationIdempotencyKey([
    'github-status',
    input.repo,
    input.sha,
    input.context,
    input.classifierVersion,
    input.outputHash,
  ]);
}

export function targetUrlTouchesForbiddenCherryTruth(targetUrl: string | undefined): boolean {
  if (targetUrl === undefined) return false;
  return /\/api\/(sessions?|ledgers?|buckets?|payments?|cards?)(\/|$)|\/api\/debts?(\/.*)?\/mutate\b/i.test(
    targetUrl
  );
}

export async function postGithubStatus(
  input: GithubStatusInput,
  options: GithubStatusPostOptions
): Promise<GithubStatusPostResult> {
  if (isAllowedGithubStatusContext(input.context) === false) {
    throw new Error(`Unsupported GitHub status context: ${input.context}`);
  }

  const statusIdempotencyKey = buildStatusIdempotencyKey(input);
  const existing = await findStatusCheckByIdempotencyKey(statusIdempotencyKey);
  if (existing !== null) {
    return { statusCheck: existing, posted: false, idempotent: true };
  }

  if (targetUrlTouchesForbiddenCherryTruth(input.targetUrl)) {
    throw new Error('GitHub status targetUrl points at a forbidden Cherry finance endpoint');
  }

  const statusCheck = await createGithubStatusCheckRecord({
    repo: input.repo,
    sha: input.sha,
    context: input.context,
    state: input.state,
    description: input.description,
    targetUrl: input.targetUrl,
    sourceWorkflow: input.sourceWorkflow,
    automationEventId: input.automationEventId,
    classifierVersion: input.classifierVersion,
    outputHash: input.outputHash,
    statusIdempotencyKey,
    githubResponse: { status: 'created_not_posted' },
  });

  if (options.githubToken.trim().length === 0) {
    const updated = await updateGithubStatusCheckResponse(statusCheck.id, {
      ok: false,
      error: 'missing_github_token',
    });
    throw Object.assign(new Error('Missing GitHub token for status posting'), {
      statusCheck: updated,
    });
  }

  const apiBaseUrl = options.apiBaseUrl ?? 'https://api.github.com';
  const response = await postGithubCommitStatus({
    apiBaseUrl,
    githubToken: options.githubToken,
    repo: input.repo,
    sha: input.sha,
    state: input.state,
    description: input.description,
    context: input.context,
    targetUrl: input.targetUrl,
  });
  const githubResponse = {
    ok: response.ok,
    status: response.status,
    body: response.body,
  };
  const updated = await updateGithubStatusCheckResponse(statusCheck.id, githubResponse);
  if (response.ok === false) {
    throw Object.assign(new Error(`GitHub status post failed with ${response.status}`), {
      statusCheck: updated,
    });
  }

  return { statusCheck: updated, posted: true, idempotent: false };
}

async function repostExistingGithubStatus(
  statusCheck: AutomationStatusCheck,
  options: GithubStatusPostOptions
): Promise<AutomationStatusCheck> {
  if (isAllowedGithubStatusContext(statusCheck.context) === false) {
    throw new Error(`Unsupported GitHub status context: ${statusCheck.context}`);
  }
  if (targetUrlTouchesForbiddenCherryTruth(statusCheck.targetUrl ?? undefined)) {
    throw new Error('GitHub status targetUrl points at a forbidden Cherry finance endpoint');
  }
  if (options.githubToken.trim().length === 0) {
    const updated = await updateGithubStatusCheckResponse(statusCheck.id, {
      ok: false,
      retry: true,
      error: 'missing_github_token',
    });
    throw Object.assign(new Error('Missing GitHub token for status retry'), {
      statusCheck: updated,
    });
  }

  const response = await postGithubCommitStatus({
    apiBaseUrl: options.apiBaseUrl ?? 'https://api.github.com',
    githubToken: options.githubToken,
    repo: statusCheck.repo,
    sha: statusCheck.sha,
    state: statusCheck.state as GithubStatusInput['state'],
    description: statusCheck.description,
    context: statusCheck.context,
    targetUrl: statusCheck.targetUrl ?? undefined,
  });
  const updated = await updateGithubStatusCheckResponse(statusCheck.id, {
    ok: response.ok,
    retry: true,
    status: response.status,
    body: response.body,
  });
  if (response.ok === false) {
    throw Object.assign(new Error(`GitHub status retry failed with ${response.status}`), {
      statusCheck: updated,
    });
  }
  return updated;
}

export async function retryGithubStatus(
  input: GithubStatusRetryInput,
  options: GithubStatusPostOptions
): Promise<GithubStatusRetryResult> {
  const statusCheck =
    input.id !== undefined
      ? await findStatusCheckById(input.id)
      : input.statusIdempotencyKey !== undefined
        ? await findStatusCheckByIdempotencyKey(input.statusIdempotencyKey)
        : null;
  if (statusCheck === null) {
    throw new GithubStatusRetryNotFoundError();
  }
  const updated = await repostExistingGithubStatus(statusCheck, options);
  return { statusCheck: updated, retried: true };
}

export async function listLatestGithubStatuses(params: {
  repo?: string;
  sha?: string;
  context?: AllowedGithubStatusContext;
}): Promise<AutomationStatusCheck[]> {
  const rows = await listGithubStatusChecks(params);
  const latest = new Map<string, (typeof rows)[number]>();
  for (const row of rows) {
    const key = `${row.repo}:${row.sha}:${row.context}`;
    const existing = latest.get(key);
    const existingTime = existing?.createdAt instanceof Date ? existing.createdAt.getTime() : 0;
    const rowTime = row.createdAt instanceof Date ? row.createdAt.getTime() : 0;
    if (existing === undefined || rowTime >= existingTime) {
      latest.set(key, row);
    }
  }
  return Array.from(latest.values()).sort((a, b) => {
    const aTime = a.createdAt instanceof Date ? a.createdAt.getTime() : 0;
    const bTime = b.createdAt instanceof Date ? b.createdAt.getTime() : 0;
    return bTime - aTime;
  });
}
