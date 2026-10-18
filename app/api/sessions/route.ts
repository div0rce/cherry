import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import {
  RecommendationStatus,
  RecommendationSource,
  SessionAnomalyCode,
  VerificationStatus,
} from '@prisma/client';
import type { CategoryCoverageModeDb, RecommendationSession, RewardCategory } from '@prisma/client';
import type { z } from 'zod';
import { prisma } from '../../../lib/prisma.js';
import {
  buildEngineContext,
  mapSolverDecisionToLegacyDecision,
  pickTopLegacySurfaceDecision,
  type LegacyEngineDecision,
} from '../../../lib/engine.js';
import { safeSolveDecisionForWorld } from '../../../lib/engine/run.js';
import type { SafeDecisionOutcome } from '../../../lib/engine/solver.js';
import { fromPrismaUserToEngineState } from '../../../lib/engine-state.js';
import { runEngine as runLegacyEngine } from '../../../lib/legacy-engine.js';
import { buildPrismaWorld } from '../../../lib/adapters/runtime/world.prisma.js';
import { deriveEngineDegradation } from '../../../lib/engine/degradation.js';
import { logError } from '../../../lib/logger.js';
import { CreateSessionSchema } from '../../../lib/schemas/sessions.js';
import { parseJsonBody } from '../../../lib/validation.js';
import { validateEngineDecision } from '../../../lib/engine-invariants.js';
import { randomUUID } from 'crypto';
import { fetchSessionSummaries } from '../../../lib/sessions/summaries.js';
import { assertUserId } from '../../../lib/invariants.js';
import { logInvariant } from '../../../lib/logging.js';
import { resolveUserContext, isPrismaP2003 } from '../../../lib/user-context.js';
import { asAppError, isUnauthorized, asLogMeta } from '../../../lib/errors.js';
import { auth } from '../../../lib/auth.js';
import { buildTemporalResponseShape, type TemporalResponseShape } from '../../../lib/engine/temporal-response.js';
import { evaluateScheduledPaydowns } from '../../../lib/engine/scheduled-paydowns.js';

const hasText = (value?: string | null): value is string =>
  value !== undefined && value !== null && value !== '';

type CreateSessionBody = z.infer<typeof CreateSessionSchema>;
type CallerContext = { userId: string | null; mode: string | null };
type Step<T> = { ok: true; value: T } | { ok: false; response: NextResponse };
type SessionError = { code: string; message: string };

type NoSessionBase = {
  engineResult: SafeDecisionOutcome;
  degradation: ReturnType<typeof deriveEngineDegradation> | null;
  temporalResponse: TemporalResponseShape;
};

/**
 * Resolve the caller. Unauthorized maps to 401, any other failure to 500.
 */
async function resolveCaller(method: string): Promise<Step<CallerContext>> {
  try {
    const ctx = await resolveUserContext({
      getSession: auth,
      requireAuth: true,
      allowLabDemo: false,
    });
    return { ok: true, value: { userId: ctx.userId, mode: ctx.mode } };
  } catch (error: unknown) {
    const appError = asAppError(error);
    if (isUnauthorized(appError)) {
      return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
    }
    logError(`Error resolving user context in /api/sessions ${method}`, appError);
    return {
      ok: false,
      response: NextResponse.json({ error: 'Failed to resolve user context' }, { status: 500 }),
    };
  }
}

function trimmedOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function normalizeSessionInput(body: CreateSessionBody) {
  const category = trimmedOrNull(body.category);
  return {
    categoryHint: category === null ? null : category.toUpperCase(),
    merchantName: trimmedOrNull(body.merchantName),
    amountCents: Math.floor(body.amountCents),
    mccCode: typeof body.mccCode === 'number' && Number.isInteger(body.mccCode) ? body.mccCode : null,
    currency: trimmedOrNull(body.currency)?.toUpperCase() ?? 'USD',
  };
}

function noSessionFields(
  { engineResult, degradation, temporalResponse }: NoSessionBase,
  error?: SessionError
) {
  return {
    sessionId: null,
    orderToken: null,
    expiresAt: null,
    source: RecommendationSource.APP_SCAN,
    ...(error === undefined ? {} : { error }),
    capabilities: engineResult.capabilities,
    degraded: engineResult.degraded,
    degradation,
    ...temporalResponse,
  };
}

function toSessionVerdict(verdict: LegacyEngineDecision['budget']['verdict']) {
  if (verdict === 'BREAKS_BUDGET') return 'BREAKS_BUDGET';
  if (verdict === 'BORDERLINE') return 'BORDERLINE';
  return 'HEALTHY';
}

type CreateSessionRowInput = {
  userId: string;
  body: CreateSessionBody;
  input: ReturnType<typeof normalizeSessionInput>;
  decision: LegacyEngineDecision;
  expiresAt: Date;
};

async function createSessionRow({ userId, body, input, decision, expiresAt }: CreateSessionRowInput) {
  return prisma.recommendationSession.create({
    data: {
      userId,
      merchantName: input.merchantName,
      mccCode: input.mccCode,
      category: decision.category,
      amountCents: decision.amountCents,
      currency: input.currency,
      deviceId: body.deviceId ?? null,
      storeId: body.storeId ?? null,
      terminalId: body.terminalId ?? null,
      orderId: body.orderId ?? null,
      orderToken: randomUUID(),
      source: RecommendationSource.APP_SCAN,
      recommendedCardId: decision.card.cardId ?? null,
      recommendedBucketId: decision.budget.bucketId ?? null,
      verdict: toSessionVerdict(decision.budget.verdict),
      budgetVerdict: decision.budget.verdict,
      cardVerdict: decision.card.verdict,
      overallVerdict: decision.overallVerdict,
      coverageMode: (decision.budget.coverageMode ?? 'UNCONFIGURED') as CategoryCoverageModeDb,
      cherryPointsOffered: decision.cherryIncentive.pointsIfFollowed,
      status: RecommendationStatus.RECOMMENDED,
      verificationStatus: VerificationStatus.UNVERIFIED,
      anomalyCode: SessionAnomalyCode.NONE,
      anomalyDetails: null,
      expiresAt,
    },
    select: { id: true, orderToken: true, expiresAt: true, source: true },
  });
}

type SessionDecisionInput = {
  userId: string;
  body: CreateSessionBody;
  input: ReturnType<typeof normalizeSessionInput>;
  requestNow: Date;
  ctxForEngine: ReturnType<typeof buildEngineContext>;
  temporalResponse: TemporalResponseShape;
};

async function respondWithEngineDecisions(
  { userId, body, input, requestNow, ctxForEngine, temporalResponse }: SessionDecisionInput,
  engineResult: Extract<SafeDecisionOutcome, { ok: true }>
): Promise<NextResponse> {
  const degradation = deriveEngineDegradation(engineResult.exclusions);
  const base: NoSessionBase = { engineResult, degradation, temporalResponse };
  const topDecision = pickTopLegacySurfaceDecision(engineResult.decisions);
  if (topDecision === undefined) {
    const error = {
      code: degradation?.code ?? 'NO_TRUTHFUL_RECOMMENDATION',
      message: degradation?.message ?? 'No truthful recommendation was available for this session.',
    };
    return NextResponse.json(noSessionFields(base, error), { status: 200 });
  }
  const mappedDecision: LegacyEngineDecision | null = mapSolverDecisionToLegacyDecision({
    solverDecision: topDecision,
    state: engineResult.state,
    ctx: ctxForEngine,
    category: (input.categoryHint as RewardCategory | null) ?? 'OTHER',
    ...(engineResult.legacyDecision ? { fallback: engineResult.legacyDecision } : {}),
  });

  if (mappedDecision === null) {
    return NextResponse.json(
      { error: { code: 'ENGINE_MAPPING', message: 'Unable to build decision' }, ...noSessionFields(base) },
      { status: 200 }
    );
  }

  const decision: LegacyEngineDecision = mappedDecision;
  validateEngineDecision(decision);

  const expiresAt = new Date(requestNow.getTime() + 15 * 60 * 1000);
  const session = await createSessionRow({ userId, body, input, decision, expiresAt });

  return NextResponse.json({
    sessionId: session.id,
    orderToken: session.orderToken,
    expiresAt: session.expiresAt,
    source: session.source,
    decision,
    capabilities: engineResult.capabilities,
    degraded: engineResult.degraded,
    degradation,
    ...temporalResponse,
  });
}

async function createSession(userId: string, body: CreateSessionBody): Promise<NextResponse> {
  const input = normalizeSessionInput(body);
  const requestNow = new Date();
  const requestNowMs = requestNow.getTime();
  const world = buildPrismaWorld();

  const ctxForEngine = buildEngineContext({
    surface: 'web',
    nowMs: requestNowMs,
    merchantName: input.merchantName,
    merchantCategoryKey: input.categoryHint ?? null,
    mcc: input.mccCode != null ? String(input.mccCode) : null,
    amountCents: input.amountCents,
  });

  const state = await fromPrismaUserToEngineState(userId, requestNowMs);
  const scheduledPaydownEvaluation = evaluateScheduledPaydowns(state, requestNowMs);
  const temporalResponse = buildTemporalResponseShape(scheduledPaydownEvaluation, requestNowMs);
  const engineResult = await safeSolveDecisionForWorld(world, userId, ctxForEngine, {
    maxCandidates: 64,
    stateOverride: state,
    scheduledPaydownEvaluation,
    legacyDecisionProvider: runLegacyEngine,
  });

  if (engineResult.ok !== true) {
    const error = { code: engineResult.reason, message: engineResult.message };
    return NextResponse.json(
      noSessionFields({ engineResult, degradation: null, temporalResponse }, error),
      { status: 200 }
    );
  }

  return respondWithEngineDecisions(
    { userId, body, input, requestNow, ctxForEngine, temporalResponse },
    engineResult
  );
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const caller = await resolveCaller('POST');
  if (!caller.ok) return caller.response;
  const { userId, mode } = caller.value;

  try {
    assertUserId(userId, 'api/sessions POST');
    const parsed = await parseJsonBody(request, CreateSessionSchema);
    if (parsed.ok !== true) return parsed.response;
    return await createSession(userId, parsed.data);
  } catch (error: unknown) {
    const appError = asAppError(error);
    if (isPrismaP2003(error)) {
      logInvariant('FK violation while creating recommendation session', {
        userId,
        mode,
        meta: asLogMeta(error.meta),
        err: error,
      });
      return NextResponse.json(
        { error: 'Failed to create session (FK violation)' },
        { status: 500 }
      );
    }
    logError('Error in /api/sessions POST', appError);
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
  }
}

function splitList(raw: string | null): string[] | null {
  if (!hasText(raw)) return null;
  return raw.split(',').map((v) => v.trim()).filter((v) => v !== '');
}

function dateOrNull(raw: string | null): Date | null {
  return hasText(raw) ? new Date(raw) : null;
}

function numberParam(key: 'limit' | 'offset', raw: string | null): { limit?: number; offset?: number } {
  return hasText(raw) ? { [key]: Number(raw) } : {};
}

function parseSessionQuery(params: URLSearchParams) {
  const statusParamRaw = params.get('status');
  const statusParam = hasText(statusParamRaw) ? statusParamRaw : 'all';
  const verdicts = splitList(params.get('verdict')) ?? [];
  const sources = splitList(params.get('source')) as RecommendationSource[] | null;

  return {
    ...numberParam('limit', params.get('limit')),
    ...numberParam('offset', params.get('offset')),
    status: statusParam as 'all' | 'active' | 'expired' | 'confirmed',
    verdict: verdicts.length > 0 ? (verdicts as RecommendationSession['verdict'][]) : null,
    from: dateOrNull(params.get('from')),
    to: dateOrNull(params.get('to')),
    source: sources,
  };
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestNow = new Date();
  const caller = await resolveCaller('GET');
  if (!caller.ok) return caller.response;
  const { userId } = caller.value;

  try {
    assertUserId(userId, 'api/sessions GET');
    const query = parseSessionQuery(request.nextUrl.searchParams);
    const { items, hasMore, limit, offset } = await fetchSessionSummaries(userId, query, {
      now: requestNow,
    });

    return NextResponse.json({
      items,
      pagination: {
        limit,
        offset,
        hasMore,
      },
    });
  } catch (error: unknown) {
    const appError = asAppError(error);
    logError('Error in /api/sessions GET', appError);
    return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
  }
}
