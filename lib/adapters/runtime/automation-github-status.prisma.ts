import type { AutomationStatusCheck, Prisma } from '@prisma/client';
import { prisma } from '../../prisma.js';

export type CreateGithubStatusCheckRecordInput = {
  repo: string;
  sha: string;
  context: string;
  state: string;
  description: string;
  targetUrl?: string | undefined;
  sourceWorkflow: string;
  automationEventId?: string | undefined;
  classifierVersion: string;
  outputHash: string;
  statusIdempotencyKey: string;
  githubResponse?: unknown;
};

export type GithubCommitStatusPostInput = {
  apiBaseUrl: string;
  githubToken: string;
  repo: string;
  sha: string;
  state: string;
  description: string;
  context: string;
  targetUrl?: string | undefined;
};

export type GithubCommitStatusPostResult = {
  ok: boolean;
  status: number;
  body: string;
};

function asJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

export async function findStatusCheckByIdempotencyKey(
  statusIdempotencyKey: string
): Promise<AutomationStatusCheck | null> {
  return prisma.automationStatusCheck.findUnique({ where: { statusIdempotencyKey } });
}

export async function findStatusCheckById(
  id: string
): Promise<AutomationStatusCheck | null> {
  return prisma.automationStatusCheck.findUnique({ where: { id } });
}

export async function createGithubStatusCheckRecord(
  input: CreateGithubStatusCheckRecordInput
): Promise<AutomationStatusCheck> {
  const data: Prisma.AutomationStatusCheckUncheckedCreateInput = {
    repo: input.repo,
    sha: input.sha,
    context: input.context,
    state: input.state,
    description: input.description,
    sourceWorkflow: input.sourceWorkflow,
    classifierVersion: input.classifierVersion,
    outputHash: input.outputHash,
    statusIdempotencyKey: input.statusIdempotencyKey,
    githubResponse: asJson(input.githubResponse ?? { status: 'created_not_posted' }),
  };
  if (input.targetUrl !== undefined) data.targetUrl = input.targetUrl;
  if (input.automationEventId !== undefined) data.automationEventId = input.automationEventId;

  return prisma.automationStatusCheck.create({ data });
}

export async function updateGithubStatusCheckResponse(
  id: string,
  githubResponse: unknown
): Promise<AutomationStatusCheck> {
  return prisma.automationStatusCheck.update({
    where: { id },
    data: { githubResponse: asJson(githubResponse) },
  });
}

export async function postGithubCommitStatus(
  input: GithubCommitStatusPostInput
): Promise<GithubCommitStatusPostResult> {
  const response = await fetch(`${input.apiBaseUrl}/repos/${input.repo}/statuses/${input.sha}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${input.githubToken}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    body: JSON.stringify({
      state: input.state,
      description: input.description,
      context: input.context,
      target_url: input.targetUrl,
    }),
  });
  const body = await response.text();
  return {
    ok: response.ok,
    status: response.status,
    body: body.slice(0, 10_000),
  };
}

export async function listGithubStatusChecks(where: {
  repo?: string;
  sha?: string;
  context?: string;
}): Promise<AutomationStatusCheck[]> {
  return prisma.automationStatusCheck.findMany({
    where,
    orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
  });
}
