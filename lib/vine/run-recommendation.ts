import {
  RecommendationStatus,
  RecommendationSource,
  SessionAnomalyCode,
  VerificationStatus,
} from '@prisma/client';
import type { CategoryCoverageModeDb } from '@prisma/client';
import { prisma } from '../prisma.js';
import { recordDecisionEvent, simulateSpendAuthority } from '../adapters/runtime/authority.prisma.js';
import type { SimulatedAuthorityDecision } from '../authority/simulateSpendAuthority.js';
import {
  buildEngineContext,
  pickTopLegacySurfaceDecision,
  mapSolverDecisionToLegacyDecision,
  type LegacyEngineDecision,
} from '../engine.js';
import { safeSolveDecisionForWorld } from '../engine/run.js';
import { fromPrismaUserToEngineState } from '../engine-state.js';
import { runEngine as runLegacyEngine } from '../legacy-engine.js';
import type { World } from '../adapters/world.js';
import type { OrderContext } from './order-context.js';
import { validateEngineDecision } from '../engine-invariants.js';
import { assertUserId } from '../invariants.js';
import { isPrismaP2003, logInvariant } from '../user-context.js';
import type { RewardCategory } from '@prisma/client';
import { deriveOrderToken } from './order-token.js';
import { assertStableId } from '../identity/hash.js';
import { AppError, asAppError } from '../errors.js';
import { deriveEngineDegradation } from '../engine/degradation.js';
import type { EngineDegradation } from '../engine/degradation.js';
import { VineDecisionError } from './errors.js';

type VineRecommendationResult = {
  sessionId: string;
  orderToken: string;
  decision: LegacyEngineDecision;
  authority: SimulatedAuthorityDecision;
  degradation: EngineDegradation;
};

type EngineContext = ReturnType<typeof buildEngineContext>;

type VineInputs = { userId: string; amountCents: number; timestamp: number };

function buildVineEngineContext(ctx: OrderContext, inputs: VineInputs): EngineContext {
  return buildEngineContext({
    surface: 'vine',
    nowMs: inputs.timestamp,
    merchantName: ctx.merchantName ?? null,
    merchantCategoryKey: null,
    mcc: ctx.mccCode != null ? String(ctx.mccCode) : null,
    amountCents: inputs.amountCents,
  });
}

type MappingInput = Parameters<typeof mapSolverDecisionToLegacyDecision>[0];

function mapTopDecision(
  engineResult: { state: MappingInput['state']; legacyDecision?: LegacyEngineDecision | null },
  topDecision: NonNullable<MappingInput['solverDecision']>,
  engineCtx: EngineContext
): LegacyEngineDecision | null {
  const legacyDecision = engineResult.legacyDecision;
  return mapSolverDecisionToLegacyDecision({
    solverDecision: topDecision,
    state: engineResult.state,
    ctx: engineCtx,
    category: (legacyDecision?.category as RewardCategory | undefined) ?? 'OTHER',
    ...(legacyDecision ? { fallback: legacyDecision } : {}),
  });
}

async function solveVineDecision(
  world: World,
  engineCtx: EngineContext,
  inputs: VineInputs
): Promise<{ decision: LegacyEngineDecision; degradation: EngineDegradation }> {
  const state = await fromPrismaUserToEngineState(inputs.userId, inputs.timestamp);
  const engineResult = await safeSolveDecisionForWorld(world, inputs.userId, engineCtx, {
    maxCandidates: 64,
    stateOverride: state,
    legacyDecisionProvider: runLegacyEngine,
  });

  if (engineResult.ok !== true) {
    throw new VineDecisionError({
      code: 'ENGINE_FAILURE',
      message: engineResult.message,
      degradation: null,
    });
  }
  const degradation = deriveEngineDegradation(engineResult.exclusions);

  const topDecision = pickTopLegacySurfaceDecision(engineResult.decisions);
  if (topDecision === undefined) {
    throw new VineDecisionError({
      code: 'NO_TRUTHFUL_DECISION',
      message: degradation?.message ?? 'No truthful decision available after constraint enforcement.',
      degradation,
    });
  }

  const mappedDecision = mapTopDecision(engineResult, topDecision, engineCtx);
  if (mappedDecision === null) {
    throw new VineDecisionError({
      code: 'DECISION_MAPPING_FAILED',
      message: 'Unable to map solver decision',
      degradation,
    });
  }

  validateEngineDecision(mappedDecision);
  return { decision: mappedDecision, degradation };
}

async function simulateAndRecordAuthority(
  decision: LegacyEngineDecision,
  inputs: VineInputs
): Promise<SimulatedAuthorityDecision> {
  const authorityParams = {
    userId: inputs.userId,
    amountCents: inputs.amountCents,
    category: decision.category,
    surface: 'vine' as const,
    counterfactuals: [],
  };
  const authorityResult = await simulateSpendAuthority(authorityParams, { nowMs: inputs.timestamp });
  const authorityDecision = authorityResult.decision;
  if (authorityResult.ok) {
    await recordDecisionEvent({
      userId: inputs.userId,
      surface: 'vine',
      params: authorityParams,
      decision: authorityDecision,
    });
  }
  return authorityDecision;
}

function resolveOrderToken(ctx: OrderContext, inputs: VineInputs): string {
  const explicitToken = ctx.nonce ?? ctx.orderId;
  if (explicitToken != null) return explicitToken;
  const derivedOrderToken = deriveOrderToken({
    userId: inputs.userId,
    amountCents: inputs.amountCents,
    mccCode: ctx.mccCode ?? null,
    merchantName: ctx.merchantName ?? null,
    timestamp: inputs.timestamp,
    deviceId: ctx.deviceId ?? null,
    terminalId: ctx.terminalId ?? null,
    storeId: ctx.storeId ?? null,
    orderId: ctx.orderId ?? null,
    nonce: ctx.nonce ?? null,
  });
  assertStableId(derivedOrderToken);
  return derivedOrderToken;
}

function resolveSource(ctx: OrderContext): RecommendationSource {
  return ctx.source === RecommendationSource.VINE_DEVICE
    ? RecommendationSource.VINE_DEVICE
    : RecommendationSource.VINE_SIM;
}

const SESSION_VERDICTS = new Set(['BREAKS_BUDGET', 'BORDERLINE']);

function sessionVerdict(decision: LegacyEngineDecision): 'BREAKS_BUDGET' | 'BORDERLINE' | 'HEALTHY' {
  const verdict = decision.budget.verdict;
  return SESSION_VERDICTS.has(verdict) ? (verdict as 'BREAKS_BUDGET' | 'BORDERLINE') : 'HEALTHY';
}

function buildSessionCreate(
  ctx: OrderContext,
  decision: LegacyEngineDecision,
  session: { userId: string; amountCents: number; orderToken: string; expiresAt: Date }
) {
  return {
    userId: session.userId,
    merchantName: ctx.merchantName ?? null,
    mccCode: ctx.mccCode ?? null,
    category: decision.category,
    amountCents: session.amountCents,
    currency: ctx.currency ?? 'USD',
    deviceId: ctx.deviceId,
    storeId: ctx.storeId ?? null,
    terminalId: ctx.terminalId ?? null,
    orderId: ctx.orderId ?? null,
    orderToken: session.orderToken,
    source: resolveSource(ctx),
    recommendedCardId: decision.card.cardId ?? null,
    recommendedBucketId: decision.budget.bucketId ?? null,
    verdict: sessionVerdict(decision),
    budgetVerdict: decision.budget.verdict,
    cardVerdict: decision.card.verdict,
    overallVerdict: decision.overallVerdict,
    coverageMode: (decision.budget.coverageMode ?? 'UNCONFIGURED') as CategoryCoverageModeDb,
    cherryPointsOffered: decision.cherryIncentive.pointsIfFollowed,
    status: RecommendationStatus.RECOMMENDED,
    verificationStatus: VerificationStatus.UNVERIFIED,
    anomalyCode: SessionAnomalyCode.NONE,
    anomalyDetails: null,
    expiresAt: session.expiresAt,
  };
}

function toPersistenceError(err: unknown, userId: string): AppError {
  const appError = asAppError(err);
  if (isPrismaP2003(err)) {
    logInvariant('FK failure in recommendationSession.create', { userId, err });
    return new AppError(
      'INTERNAL',
      'Internal error: failed to persist recommendation session (FK violation)',
      500
    );
  }
  logInvariant('Error creating recommendation session from Vine', { userId, err: appError });
  return appError;
}

export async function runRecommendationFromOrderContext(
  world: World,
  ctx: OrderContext,
  userId: string,
  options: { now: Date }
): Promise<VineRecommendationResult> {
  assertUserId(userId);

  const fallbackTimestamp = options.now.getTime();
  const timestamp = Number.isFinite(ctx.timestamp) ? ctx.timestamp : fallbackTimestamp;
  const amountCents = Math.floor(ctx.amountCents);

  if (amountCents <= 0) {
    throw new Error('amountCents must be a positive integer');
  }
  const inputs: VineInputs = { userId, amountCents, timestamp };

  const engineCtx = buildVineEngineContext(ctx, inputs);
  const { decision, degradation } = await solveVineDecision(world, engineCtx, inputs);
  const authorityDecision = await simulateAndRecordAuthority(decision, inputs);

  const expiresAt = new Date(Math.max(timestamp, options.now.getTime()) + 15 * 60 * 1000);
  const orderToken = resolveOrderToken(ctx, inputs);

  try {
    const session = await prisma.recommendationSession.upsert({
      where: { orderToken },
      create: buildSessionCreate(ctx, decision, { userId, amountCents, orderToken, expiresAt }),
      update: {
        expiresAt,
        status: RecommendationStatus.RECOMMENDED,
        verificationStatus: VerificationStatus.UNVERIFIED,
      },
      select: { id: true },
    });

    return {
      sessionId: session.id,
      orderToken,
      decision,
      authority: authorityDecision,
      degradation,
    };
  } catch (err: unknown) {
    throw toPersistenceError(err, userId);
  }
}
