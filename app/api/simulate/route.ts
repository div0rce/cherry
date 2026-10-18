import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { RewardCategory, TransactionStatus } from '@prisma/client';
import type { z } from 'zod';
import { prisma } from '../../../lib/prisma.js';
import { logError, logWarn } from '../../../lib/logger.js';
import { SimulateRequestSchema } from '../../../lib/schemas/simulate.js';
import { validateEngineDecision } from '../../../lib/engine-invariants.js';
import {
  resolveUserContext,
  assertUserId,
  logInvariant,
  isPrismaP2003,
} from '../../../lib/user-context.js';
import type { UserContextMode } from '../../../lib/user-context.js';
import { asAppError, isUnauthorized, asLogMeta } from '../../../lib/errors.js';
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
import { hasText } from '../../../lib/text.js';
import { isPositiveNumber } from '../../../lib/numbers.js';
import { logGuardrailEvent, logInvariantViolation, type GuardrailOutcome } from '../../../lib/log.js';
import { buildSwipeIdempotencyKey } from '../../../lib/ids.js';
import { parseJsonBody } from '../../../lib/validation.js';
import { recordDecisionEvent, simulateSpendAuthority } from '../../../lib/adapters/runtime/authority.prisma.js';
import { buildPrismaWorld } from '../../../lib/adapters/runtime/world.prisma.js';
import { deriveEngineDegradation } from '../../../lib/engine/degradation.js';
import type {
  SimulatedAuthorityDecision,
  SimulateSpendParams,
} from '../../../lib/authority/simulateSpendAuthority.js';
import { auth } from '../../../lib/auth.js';
import { buildTemporalResponseShape, type TemporalResponseShape } from '../../../lib/engine/temporal-response.js';
import { evaluateScheduledPaydowns } from '../../../lib/engine/scheduled-paydowns.js';

const validCategories = Object.values(RewardCategory) as string[];

type SimulateBody = z.infer<typeof SimulateRequestSchema>;
type EngineSuccess = Extract<SafeDecisionOutcome, { ok: true }>;
type EngineContext = ReturnType<typeof buildEngineContext>;

type RequestClock = { now: Date; nowMs: number; timestamp: string };

type SimulateRun = {
  clock: RequestClock;
  authorityDecision: SimulatedAuthorityDecision | null;
};

type ValidatedFields = {
  normalizedCategory: string;
  merchantName: string;
  mccCode: number | null;
  errors: string[];
};

type ResponseBase = {
  simulationId: string;
  capabilities: SafeDecisionOutcome['capabilities'];
  degraded: SafeDecisionOutcome['degraded'];
  degradation: ReturnType<typeof deriveEngineDegradation> | null;
  authority: SimulatedAuthorityDecision | null;
  temporalResponse: TemporalResponseShape;
};

type SimulationError = { code: string; message: string };



function logSimulateEvent(
  { userId, clock }: { userId: string; clock: RequestClock },
  outcome: GuardrailOutcome,
  reason: string,
  detail?: Record<string, unknown>
): void {
  logGuardrailEvent({
    userId,
    surface: 'simulate',
    outcome,
    reason,
    ...(detail === undefined ? {} : { detail }),
    timestamp: clock.timestamp,
    timestampSource: 'boundary',
  });
}

function parseMccCode(raw: SimulateBody['mccCode']): { ok: boolean; value: number | null } {
  if (raw === null || raw === undefined) {
    return { ok: true, value: null };
  }
  const asInt = Number.parseInt(String(raw), 10);
  const hasValidMcc = Number.isInteger(asInt) && String(asInt).length === 4;
  return hasValidMcc ? { ok: true, value: asInt } : { ok: false, value: null };
}

function isValidCategory(normalizedCategory: string): boolean {
  return hasText(normalizedCategory) && validCategories.includes(normalizedCategory);
}

function validateFields(body: SimulateBody): ValidatedFields {
  const normalizedCategory = body.category.toUpperCase();
  const merchantName = hasText(body.merchantName) ? body.merchantName.trim() : '';
  const mcc = parseMccCode(body.mccCode);
  const checks: Array<[string, boolean]> = [
    ['amountCents', isPositiveNumber(body.amountCents)],
    ['category', isValidCategory(normalizedCategory)],
    ['merchantName', hasText(merchantName)],
    ['mccCode', mcc.ok],
  ];
  const errors = checks.filter(([, valid]) => !valid).map(([field]) => field);
  return { normalizedCategory, merchantName, mccCode: mcc.value, errors };
}

async function resolveSimulationId(body: SimulateBody, userId: string): Promise<string> {
  if (hasText(body.simulationId)) {
    return body.simulationId;
  }
  const created = await prisma.simulation.create({
    data: { userId },
    select: { id: true },
  });
  return created.id;
}

async function runAuthorityCheck(
  run: SimulateRun,
  userId: string,
  body: SimulateBody,
  normalizedCategory: string
): Promise<void> {
  const authorityParams: SimulateSpendParams = {
    userId,
    amountCents: body.amountCents,
    category: normalizedCategory as RewardCategory,
    surface: 'simulate',
    counterfactuals: [],
  };
  const authorityResult = await simulateSpendAuthority(authorityParams, { nowMs: run.clock.nowMs });
  run.authorityDecision = authorityResult.decision;
  if (authorityResult.ok !== true) {
    const outcome = authorityResult.status === 'blocked' ? 'STOP' : 'FALLBACK';
    logSimulateEvent({ userId, clock: run.clock }, outcome, `AUTHORITY_${authorityResult.reason}`, {
      status: authorityResult.status,
    });
    return;
  }
  await recordDecisionEvent({
    userId,
    surface: 'simulate',
    params: authorityParams,
    decision: run.authorityDecision,
  });
}

function respondWithoutTransaction(
  base: ResponseBase,
  decision: LegacyEngineDecision | null,
  error?: SimulationError
): NextResponse {
  return NextResponse.json(
    {
      simulationId: base.simulationId,
      transaction: null,
      decision,
      capabilities: base.capabilities,
      degraded: base.degraded,
      degradation: base.degradation,
      authority: base.authority,
      committed: false,
      ...(error === undefined ? {} : { error }),
      ...base.temporalResponse,
    },
    { status: 200 }
  );
}

function deriveTransactionFields(decision: LegacyEngineDecision) {
  const { budget, card } = decision;
  const strictDecline = (budget.wouldExceed ?? false) && (budget.strictMode ?? false);
  const bucketBeforeCents =
    budget.limitCents != null && budget.spentBeforeCents != null
      ? budget.limitCents - budget.spentBeforeCents
      : null;
  const bucketAfterCents = strictDecline ? bucketBeforeCents : budget.remainingAfterCents ?? null;
  const rewardMultiplier = card.rewardUnit === 'issuer_points' ? (card.rewardRate ?? null) : null;
  const cashbackPercent =
    card.rewardUnit === 'cashback_cents' && card.rewardRate != null ? card.rewardRate * 100 : null;
  return {
    strictDecline,
    bucketBeforeCents,
    bucketAfterCents,
    bucketLimitCents: budget.limitCents ?? null,
    rewardMultiplier,
    rewardsEarnedPoints: card.rewardPoints ?? null,
    rewardsEarnedCents: card.rewardValueCents ?? null,
    cashbackPercent,
  };
}

type CommitInput = {
  userId: string;
  clock: RequestClock;
  body: SimulateBody;
  merchantName: string;
  decision: LegacyEngineDecision;
  strictDecline: boolean;
};

function canCommit(input: CommitInput): boolean {
  return (
    !input.strictDecline &&
    process.env.NODE_ENV !== 'production' &&
    hasText(input.decision.budget.bucketId) &&
    hasText(input.decision.card.cardId) &&
    isPositiveNumber(input.body.amountCents) &&
    hasText(input.merchantName)
  );
}

function logCommitIntent(input: CommitInput): void {
  if (input.body.commit !== true) {
    return;
  }
  const { userId, clock, decision } = input;
  if (canCommit(input)) {
    const swipeIdempotencyKey = buildSwipeIdempotencyKey({
      userId,
      merchant: input.merchantName,
      amountCents: input.body.amountCents,
      occurredAt: clock.now,
    });
    logSimulateEvent({ userId, clock }, 'OK', 'COMMIT_READY', { swipeIdempotencyKey });
    return;
  }
  logSimulateEvent({ userId, clock }, 'STOP', 'COMMIT_PRECONDITION_FAILED', {
    strictDecline: input.strictDecline,
    bucketId: decision.budget.bucketId ?? null,
    cardId: decision.card.cardId ?? null,
  });
}

type PersistInput = {
  simulationId: string;
  userId: string;
  amountCents: number;
  merchantName: string;
  mccCode: number | null;
  decision: LegacyEngineDecision;
  fields: ReturnType<typeof deriveTransactionFields>;
};

async function persistSimulatedTransaction(input: PersistInput) {
  const { decision, fields } = input;
  return prisma.$transaction(async (db) => {
    const simTx = await db.simulatedTransaction.create({
      data: {
        simulationId: input.simulationId,
        userId: input.userId,
        amount: input.amountCents,
        merchantName: input.merchantName,
        resolvedCategory: decision.category,
        mccCode: input.mccCode,

        bucketId: decision.budget.bucketId ?? null,
        bucketName: decision.budget.name ?? null,
        bucketPeriod: null,
        bucketBeforeCents: fields.bucketBeforeCents,
        bucketAfterCents: fields.bucketAfterCents,
        bucketLimitCents: fields.bucketLimitCents,

        chosenCardId: decision.card.cardId ?? null,
        chosenCardName: decision.card.cardNickname ?? null,

        rewardMultiplier: fields.rewardMultiplier,
        rewardsEarned: fields.rewardsEarnedPoints,
        multiplier: fields.rewardMultiplier,
        cashbackPercent: fields.cashbackPercent,
        rewardsEarnedPoints: fields.rewardsEarnedPoints,
        rewardsEarnedCents: fields.rewardsEarnedCents,

        strictDecline: fields.strictDecline,
        status: fields.strictDecline ? TransactionStatus.DECLINED : TransactionStatus.APPROVED,
        reason: fields.strictDecline ? 'STRICT_DECLINE' : 'APPROVED',
      },
    });

    return simTx;
  });
}

type DecisionInput = {
  run: SimulateRun;
  userId: string;
  mode: UserContextMode;
  body: SimulateBody;
  fields: ValidatedFields;
  ctx: EngineContext;
  base: ResponseBase;
};

async function respondWithCardDecision(
  input: DecisionInput,
  decision: LegacyEngineDecision
): Promise<NextResponse> {
  const { run, userId, body, fields, base } = input;
  if (!isPositiveNumber(decision.amountCents)) {
    logInvariantViolation({
      surface: 'simulate',
      detail: 'Decision amount missing',
      data: { decision },
      timestamp: run.clock.timestamp,
    });
    return NextResponse.json({ error: 'Unable to process decision' }, { status: 500 });
  }

  if (!hasText(decision.card.cardId)) {
    logSimulateEvent({ userId, clock: run.clock }, 'STOP', 'MISSING_CARD');
    return respondWithoutTransaction(base, null, {
      code: 'INCOMPLETE_DECISION',
      message: 'No card available for simulation',
    });
  }

  if (!hasText(decision.budget.bucketId)) {
    logSimulateEvent({ userId, clock: run.clock }, 'WARN', 'MISSING_BUCKET');
  }

  const txFields = deriveTransactionFields(decision);
  logCommitIntent({
    userId,
    clock: run.clock,
    body,
    merchantName: fields.merchantName,
    decision,
    strictDecline: txFields.strictDecline,
  });

  const tx = await persistSimulatedTransaction({
    simulationId: base.simulationId,
    userId,
    amountCents: body.amountCents,
    merchantName: fields.merchantName,
    mccCode: fields.mccCode,
    decision,
    fields: txFields,
  });

  return NextResponse.json({
    simulationId: base.simulationId,
    transaction: tx,
    decision,
    capabilities: base.capabilities,
    degraded: base.degraded,
    degradation: base.degradation,
    authority: base.authority,
    committed: false,
    ...base.temporalResponse,
  });
}

function isCardAction(topDecision: NonNullable<ReturnType<typeof pickTopLegacySurfaceDecision>>): boolean {
  return topDecision.action.type === 'USE_CARD' || topDecision.action.type === 'USE_CARD_WITH_PAYDOWN';
}

async function respondWithEngineDecisions(
  input: DecisionInput,
  engineResult: EngineSuccess
): Promise<NextResponse> {
  const { run, userId, mode, ctx, fields } = input;
  const degradation = deriveEngineDegradation(engineResult.exclusions);
  const base: ResponseBase = { ...input.base, degradation };
  const topDecision = pickTopLegacySurfaceDecision(engineResult.decisions);
  if (topDecision === undefined) {
    return respondWithoutTransaction(base, null, {
      code: degradation?.code ?? 'NO_TRUTHFUL_RECOMMENDATION',
      message: degradation?.message ?? 'No truthful recommendation was available for this simulation.',
    });
  }
  const mappedDecision = mapSolverDecisionToLegacyDecision({
    solverDecision: topDecision,
    state: engineResult.state,
    ctx,
    category: fields.normalizedCategory as RewardCategory,
    ...(engineResult.legacyDecision ? { fallback: engineResult.legacyDecision } : {}),
  });

  if (mappedDecision === null) {
    logWarn('Engine mapping failed in /api/simulate', { userId, mode });
    logSimulateEvent({ userId, clock: run.clock }, 'FALLBACK', 'ENGINE_MAPPING_FAILED');
    return respondWithoutTransaction(base, null, {
      code: 'ENGINE_MAPPING',
      message: 'Unable to build decision',
    });
  }

  const decision: LegacyEngineDecision = mappedDecision;
  validateEngineDecision(decision);
  if (!isCardAction(topDecision)) {
    return respondWithoutTransaction(base, decision);
  }
  return respondWithCardDecision({ ...input, base }, decision);
}

async function runSimulate(request: NextRequest, run: SimulateRun): Promise<NextResponse> {
  const { clock } = run;
  const { userId, mode } = await resolveUserContext({
    getSession: auth,
    requireAuth: false,
    allowLabDemo: true,
  });
  assertUserId(userId, 'api/simulate POST');

  const parsedBody = await parseJsonBody(request, SimulateRequestSchema);
  if (parsedBody.ok !== true) {
    logSimulateEvent({ userId, clock }, 'STOP', 'INVALID_PAYLOAD');
    return NextResponse.json({ error: 'Invalid request' }, { status: parsedBody.response.status });
  }
  const body = parsedBody.data;

  const fields = validateFields(body);
  if (fields.errors.length > 0) {
    logSimulateEvent({ userId, clock }, 'STOP', 'INVALID_FIELDS', { fields: fields.errors });
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const simulationId = await resolveSimulationId(body, userId);
  const world = buildPrismaWorld();
  await runAuthorityCheck(run, userId, body, fields.normalizedCategory);
  const ctx = buildEngineContext({
    surface: 'web',
    nowMs: clock.nowMs,
    merchantName: fields.merchantName,
    merchantCategoryKey: fields.normalizedCategory,
    mcc: fields.mccCode != null ? String(fields.mccCode) : null,
    amountCents: body.amountCents,
  });

  const state = await fromPrismaUserToEngineState(userId, clock.nowMs);
  const scheduledPaydownEvaluation = evaluateScheduledPaydowns(state, clock.nowMs);
  const temporalResponse = buildTemporalResponseShape(scheduledPaydownEvaluation, clock.nowMs);
  const engineResult = await safeSolveDecisionForWorld(world, userId, ctx, {
    maxCandidates: 64,
    stateOverride: state,
    scheduledPaydownEvaluation,
    legacyDecisionProvider: runLegacyEngine,
  });
  const base: ResponseBase = {
    simulationId,
    capabilities: engineResult.capabilities,
    degraded: engineResult.degraded,
    degradation: null,
    authority: run.authorityDecision,
    temporalResponse,
  };
  if (engineResult.ok !== true) {
    logWarn('Engine failed in /api/simulate', { userId, mode, reason: engineResult.reason });
    logSimulateEvent({ userId, clock }, 'FALLBACK', `ENGINE_${engineResult.reason}`);
    return respondWithoutTransaction(base, null, {
      code: engineResult.reason,
      message: engineResult.message,
    });
  }

  return respondWithEngineDecisions({ run, userId, mode, body, fields, ctx, base }, engineResult);
}

function simulateErrorResponse(caught: unknown, authorityDecision: SimulatedAuthorityDecision | null): NextResponse {
  const appError = asAppError(caught);
  if (isPrismaP2003(caught)) {
    const meta = asLogMeta((caught as { meta?: unknown }).meta);
    logInvariant('P2003 while processing simulate', { meta, err: caught });
    return NextResponse.json({ error: 'Failed to process simulation (FK violation)' }, { status: 500 });
  }
  if (isUnauthorized(appError)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  logError('Error in /api/simulate', appError);
  return NextResponse.json(
    { error: 'Failed to run simulation', ...(authorityDecision ? { authority: authorityDecision } : {}) },
    { status: 500 }
  );
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestNow = new Date();
  const run: SimulateRun = {
    clock: { now: requestNow, nowMs: requestNow.getTime(), timestamp: requestNow.toISOString() },
    authorityDecision: null,
  };
  try {
    return await runSimulate(request, run);
  } catch (caught: unknown) {
    return simulateErrorResponse(caught, run.authorityDecision);
  }
}
