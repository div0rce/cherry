import * as crypto from 'node:crypto';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import {
  buildEngineContext,
  mapSolverDecisionToLegacyDecision,
  pickTopLegacySurfaceDecision,
  type LegacyEngineDecision,
} from '../../../lib/engine.js';
import { safeSolveDecisionForWorld } from '../../../lib/engine/run.js';
import { fromLegacy } from '../../../lib/engine/input/fromLegacy.js';
import { validateEngineInput } from '../../../lib/engine/input/validate.js';
import {
  getEngineVersionSnapshot,
  maybeRecordReplayTrace,
} from '../../../lib/adapters/runtime/replay-recorder.js';
import { fromPrismaUserToEngineState } from '../../../lib/engine-state.js';
import { runEngine as runLegacyEngine } from '../../../lib/legacy-engine.js';
import { recordDecisionEvent, simulateSpendAuthority } from '../../../lib/adapters/runtime/authority.prisma.js';
import { buildPrismaWorld } from '../../../lib/adapters/runtime/world.prisma.js';
import type { SimulatedAuthorityDecision } from '../../../lib/authority/simulateSpendAuthority.js';
import { resolveScanCategory } from '../../../lib/scan-helpers.js';
import type { ScanResponseBody } from '../../../lib/scan-types.js';
import { deriveEngineDegradation } from '../../../lib/engine/degradation.js';
import { logError } from '../../../lib/logger.js';
import { asAppError, isUnauthorized } from '../../../lib/errors.js';
import { ScanRequestSchema } from '../../../lib/schemas/scan.js';
import { parseJsonBody } from '../../../lib/validation.js';
import { validateEngineDecision } from '../../../lib/engine-invariants.js';
import { resolveUserContext } from '../../../lib/user-context.js';
import type { RewardCategory } from '@prisma/client';
import { auth } from '../../../lib/auth.js';
import { buildTemporalResponseShape } from '../../../lib/engine/temporal-response.js';
import { evaluateScheduledPaydowns } from '../../../lib/engine/scheduled-paydowns.js';

const hasText = (value?: string | null): value is string =>
  value !== undefined && value !== null && value !== '';

type EngineRunResult = Awaited<ReturnType<typeof safeSolveDecisionForWorld>>;
type EngineRunSuccess = Extract<EngineRunResult, { ok: true }>;
type EngineState = Awaited<ReturnType<typeof fromPrismaUserToEngineState>>;
type EngineContext = ReturnType<typeof buildEngineContext>;
type TemporalResponse = ReturnType<typeof buildTemporalResponseShape>;
type EngineDegradation = ReturnType<typeof deriveEngineDegradation>;
type SurfaceDecision = NonNullable<ReturnType<typeof pickTopLegacySurfaceDecision>>;

type ScanInput = {
  userId: string;
  merchantName: string;
  mccCode: number | null;
  category: RewardCategory;
  amountCents: number;
};

type ScanOutcomeMeta = {
  engineResult: Pick<EngineRunResult, 'capabilities' | 'degraded'>;
  degradation: EngineDegradation | null;
  authorityDecision: SimulatedAuthorityDecision | null;
  temporalResponse: TemporalResponse;
};

function resolveAmountCents(expectedAmountCents: unknown): number {
  return typeof expectedAmountCents === 'number' &&
    Number.isFinite(expectedAmountCents) &&
    expectedAmountCents >= 0
    ? Math.floor(expectedAmountCents)
    : 0;
}

function fallbackResponse(
  error: { code: string; message: string },
  meta: ScanOutcomeMeta
): NextResponse {
  return NextResponse.json(
    {
      error,
      decision: null,
      capabilities: meta.engineResult.capabilities,
      degraded: meta.engineResult.degraded,
      degradation: meta.degradation,
      authority: meta.authorityDecision,
      ...meta.temporalResponse,
    },
    { status: 200 }
  );
}

function recordScanReplay(
  userId: string,
  state: EngineState,
  ctx: EngineContext,
  engineResult: EngineRunSuccess
): void {
  const engineInput = fromLegacy({
    state,
    context: ctx,
    options: {
      maxCandidates: 64,
      weightsOverride: null,
    },
  });
  if (validateEngineInput(engineInput).length !== 0) return;
  const replayEnabled = process.env['CHERRY_ENGINE_REPLAY_RECORD'] === '1';
  if (!replayEnabled) return;
  const userToken = typeof userId === 'string' && userId.length > 0 ? userId : 'unknown';
  const userHash = crypto.createHash('sha256').update(userToken).digest('hex').slice(0, 4);
  const userLabel = `user-${userHash}`;
  const replayState = {
    ...engineResult.state,
    userId: userLabel,
    cards: engineResult.state.cards.map((card) => ({ ...card, userId: userLabel })),
  };
  const replayOutput = {
    decisions: engineResult.decisions,
    trace: engineResult.trace,
    state: replayState,
  };
  void maybeRecordReplayTrace({
    enabled: replayEnabled,
    input: engineInput,
    versions: getEngineVersionSnapshot(),
    output: replayOutput,
    meta: {
      traceId: 'scan',
      source: 'api/scan',
      surface: ctx.surface,
      timestampMs: ctx.nowMs,
      user: userLabel,
    },
  });
}

function toBucketResponse(bucket: LegacyEngineDecision['budget']) {
  return {
    name: bucket.name ?? null,
    limitCents: bucket.limitCents ?? null,
    spentBeforeCents: bucket.spentBeforeCents ?? null,
    spentAfterCents: bucket.spentAfterCents ?? null,
    remainingAfterCents: bucket.remainingAfterCents ?? null,
    strictMode: bucket.strictMode ?? false,
    wouldExceed: bucket.wouldExceed ?? false,
    coverageMode: bucket.coverageMode,
    verdict: bucket.verdict,
  };
}

function toCardRecommendation(card: LegacyEngineDecision['card']) {
  return {
    cardId: card.cardId ?? null,
    cardNickname: card.cardNickname ?? null,
    rewardUnit: card.rewardUnit ?? null,
    rewardRate: card.rewardRate ?? null,
    rewardPoints: card.rewardPoints ?? null,
    rewardValueCents: card.rewardValueCents ?? null,
    verdict: card.verdict,
  };
}

function successResponse(
  input: ScanInput,
  decision: LegacyEngineDecision,
  meta: ScanOutcomeMeta
): NextResponse {
  const response: ScanResponseBody = {
    merchantName: input.merchantName,
    category: decision.category,
    amountCents: input.amountCents,
    bucket: toBucketResponse(decision.budget),
    cardRecommendation: toCardRecommendation(decision.card),
    budgetVerdict: decision.budget.verdict,
    cardVerdict: decision.card.verdict,
    overallVerdict: decision.overallVerdict,
    cherryIncentive: decision.cherryIncentive,
    decision,
    capabilities: meta.engineResult.capabilities,
    degraded: meta.engineResult.degraded,
    degradation: meta.degradation,
    authority: meta.authorityDecision,
    ...meta.temporalResponse,
  };
  return NextResponse.json(response);
}

function respondWithTopDecision(
  input: ScanInput,
  run: { ctx: EngineContext; engineResult: EngineRunSuccess; topDecision: SurfaceDecision },
  meta: ScanOutcomeMeta
): NextResponse {
  const { ctx, engineResult, topDecision } = run;
  const mappedDecision: LegacyEngineDecision | null = mapSolverDecisionToLegacyDecision({
    solverDecision: topDecision,
    state: engineResult.state,
    ctx,
    category: input.category,
    ...(engineResult.legacyDecision ? { fallback: engineResult.legacyDecision } : {}),
  });
  if (mappedDecision === null) {
    return fallbackResponse({ code: 'ENGINE_MAPPING', message: 'Unable to build decision' }, meta);
  }
  validateEngineDecision(mappedDecision);
  return successResponse(input, mappedDecision, meta);
}

async function evaluateScan(
  input: ScanInput,
  world: ReturnType<typeof buildPrismaWorld>,
  nowMs: number,
  authorityDecision: SimulatedAuthorityDecision | null
): Promise<NextResponse> {
  const ctx = buildEngineContext({
    surface: 'web',
    nowMs,
    merchantName: input.merchantName,
    merchantCategoryKey: input.category,
    mcc: input.mccCode !== null ? String(input.mccCode) : null,
    amountCents: input.amountCents,
  });

  const state = await fromPrismaUserToEngineState(input.userId, nowMs);
  const scheduledPaydownEvaluation = evaluateScheduledPaydowns(state, nowMs);
  const temporalResponse = buildTemporalResponseShape(scheduledPaydownEvaluation, nowMs);
  const engineResult = await safeSolveDecisionForWorld(world, input.userId, ctx, {
    maxCandidates: 64,
    stateOverride: state,
    scheduledPaydownEvaluation,
    legacyDecisionProvider: runLegacyEngine,
  });

  if (engineResult.ok !== true) {
    return fallbackResponse(
      { code: engineResult.reason, message: engineResult.message },
      { engineResult, degradation: null, authorityDecision, temporalResponse }
    );
  }

  const degradation = deriveEngineDegradation(engineResult.exclusions);
  recordScanReplay(input.userId, state, ctx, engineResult);

  const meta: ScanOutcomeMeta = { engineResult, degradation, authorityDecision, temporalResponse };
  const topDecision = pickTopLegacySurfaceDecision(engineResult.decisions);
  if (topDecision === undefined) {
    return fallbackResponse(
      {
        code: degradation?.code ?? 'NO_TRUTHFUL_RECOMMENDATION',
        message: degradation?.message ?? 'No truthful recommendation was available for this scan.',
      },
      meta
    );
  }
  return respondWithTopDecision(input, { ctx, engineResult, topDecision }, meta);
}

async function runScan(input: ScanInput): Promise<NextResponse> {
  const now = new Date();
  const nowMs = now.getTime();
  const world = buildPrismaWorld();

  let authorityDecision: SimulatedAuthorityDecision | null = null;
  try {
    const authorityParams = {
      userId: input.userId,
      amountCents: input.amountCents,
      category: input.category,
      surface: 'scan' as const,
      counterfactuals: [],
    };
    const authorityResult = await simulateSpendAuthority(authorityParams, { nowMs });
    authorityDecision = authorityResult.decision;
    if (authorityResult.ok) {
      await recordDecisionEvent({
        userId: input.userId,
        surface: 'scan',
        params: authorityParams,
        decision: authorityDecision,
      });
    }
    return await evaluateScan(input, world, nowMs, authorityDecision);
  } catch (error: unknown) {
    const appError = asAppError(error);
    logError('Error in /api/scan', appError);
    return NextResponse.json(
      {
        error: 'Failed to evaluate scan',
        ...(authorityDecision ? { authority: authorityDecision } : {}),
      },
      { status: 500 }
    );
  }
}

function mapOuterError(error: unknown): NextResponse {
  const appError = asAppError(error);
  if (isUnauthorized(appError)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  logError('Error in /api/scan', appError);
  return NextResponse.json({ error: 'Failed to evaluate scan' }, { status: 500 });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { userId } = await resolveUserContext({
      getSession: auth,
      requireAuth: false,
      allowLabDemo: true,
    });
    const parsed = await parseJsonBody(request, ScanRequestSchema);
    if (parsed.ok !== true) return parsed.response;
    const body = parsed.data;

    if (!hasText(body.merchantName)) {
      return NextResponse.json(
        { error: 'merchantName is required and must be a string' },
        { status: 400 }
      );
    }

    const mccCode = typeof body.mccCode === 'number' ? body.mccCode : null;
    const category: RewardCategory = await resolveScanCategory({
      userId,
      merchantName: body.merchantName,
      mccCode,
      explicitCategory: body.category ?? null,
    });

    return await runScan({
      userId,
      merchantName: body.merchantName,
      mccCode,
      category,
      amountCents: resolveAmountCents(body.expectedAmountCents),
    });
  } catch (error: unknown) {
    return mapOuterError(error);
  }
}
