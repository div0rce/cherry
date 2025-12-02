import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { RewardCategory, TransactionStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { logError, logWarn } from '@/lib/logger';
import { parseJsonBody } from '@/lib/validation';
import { SimulateRequestSchema } from '@/lib/schemas/simulate';
import { validateEngineDecision } from '@/lib/engine-invariants';
import {
  resolveUserContext,
  assertUserId,
  logInvariant,
  isPrismaP2003,
} from '@/lib/user-context';
import {
  buildEngineContext,
  safeSolveDecisionForUser,
  type EngineDecision as SolverDecision,
  type EngineState,
  type EngineContext,
  type LegacyEngineDecision,
  type CategoryCoverageMode,
} from '@/lib/engine';
import type { BudgetVerdict, CardVerdict, OverallVerdict } from '@/lib/enums';

const validCategories = Object.values(RewardCategory) as string[];

function deriveOverallVerdict(budgetVerdict: BudgetVerdict, cardVerdict: CardVerdict): OverallVerdict {
  if (budgetVerdict === 'UNCONFIGURED') return 'UNKNOWN';
  if (budgetVerdict === 'BREAKS_BUDGET') return 'RED';
  if (budgetVerdict === 'BORDERLINE') return 'YELLOW';
  if (budgetVerdict === 'UNBOUNDED') {
    if (cardVerdict === 'NO_CARD_DATA') return 'UNKNOWN';
    return 'GREEN';
  }
  if (cardVerdict === 'NO_CARD_DATA') return 'YELLOW';
  return 'GREEN';
}

function computeCherryIncentive(amountCents: number, budgetVerdict: BudgetVerdict): {
  pointsIfFollowed: number;
  expiryMinutes: number;
} {
  if (amountCents <= 0) return { pointsIfFollowed: 0, expiryMinutes: 0 };
  const base = Math.min(Math.floor(amountCents / 1000), 20);
  let multiplier = 1;
  if (budgetVerdict === 'HEALTHY') multiplier = 2;
  else if (budgetVerdict === 'BREAKS_BUDGET') multiplier = 0;
  return { pointsIfFollowed: base * multiplier, expiryMinutes: 15 };
}

function mapSolverDecisionToLegacy(input: {
  solverDecision?: SolverDecision;
  state: EngineState;
  ctx: EngineContext;
  category: RewardCategory;
  fallback?: LegacyEngineDecision;
}): LegacyEngineDecision | null {
  const { solverDecision, state, ctx, category, fallback } = input;
  if (!solverDecision || ctx.amountCents == null) {
    return fallback ?? null;
  }

  const amountCents = ctx.amountCents;
  const bucketProj = solverDecision.projections.buckets[0];
  const bucket = bucketProj ? state.buckets.find((b) => b.id === bucketProj.bucketId) : undefined;
  const limitCents = bucket?.limitCents ?? undefined;
  const spentAfterCents = bucketProj?.projectedSpentCents ?? undefined;
  const spentBeforeCents =
    spentAfterCents != null ? Math.max(spentAfterCents - amountCents, 0) : undefined;
  const remainingAfterCents =
    limitCents != null && spentAfterCents != null ? limitCents - spentAfterCents : undefined;
  const wouldExceed =
    limitCents != null && spentAfterCents != null ? spentAfterCents > limitCents : false;

  let budgetVerdict: BudgetVerdict = 'UNCONFIGURED';
  let coverageMode: CategoryCoverageMode = 'UNCONFIGURED';
  if (bucket) {
    coverageMode = 'BUDGETED';
    if (limitCents == null) {
      budgetVerdict = 'UNBOUNDED';
    } else if (wouldExceed) {
      budgetVerdict = 'BREAKS_BUDGET';
    } else if (remainingAfterCents != null && limitCents > 0 && remainingAfterCents / limitCents < 0.1) {
      budgetVerdict = 'BORDERLINE';
    } else {
      budgetVerdict = 'HEALTHY';
    }
  }

  const card =
    solverDecision.action.type === 'USE_CARD' && solverDecision.action.cardId
      ? state.cards.find((c) => c.id === solverDecision.action.cardId)
      : undefined;

  const categoryKey = ctx.merchantCategoryKey ?? 'OTHER';
  const rewardRule =
    card?.rewardRules.find((r) => r.categoryKey === categoryKey) ??
    card?.rewardRules.find((r) => r.categoryKey === 'GENERAL_MERCHANDISE') ??
    card?.rewardRules.find((r) => r.categoryKey === 'OTHER') ??
    null;

  const dollars = amountCents / 100;
  const multiplier =
    rewardRule?.rateType === 'POINTS_PER_DOLLAR' ? rewardRule.rateValue : null;
  const estimatedRewards =
    rewardRule == null
      ? null
      : rewardRule.rateType === 'POINTS_PER_DOLLAR'
        ? Math.floor(dollars * rewardRule.rateValue)
        : Math.floor(amountCents * rewardRule.rateValue);

  const cardVerdict: CardVerdict = card ? 'OPTIMAL' : 'NO_CARD_DATA';
  const overallVerdict = deriveOverallVerdict(budgetVerdict, cardVerdict);
  const cherryIncentive =
    cardVerdict === 'NO_CARD_DATA'
      ? { pointsIfFollowed: 0, expiryMinutes: 0 }
      : computeCherryIncentive(amountCents, budgetVerdict);

  const budget: LegacyEngineDecision['budget'] = {
    verdict: budgetVerdict,
    coverageMode,
    hasBucket: Boolean(bucket),
    strictMode: bucket?.strictMode ?? false,
    wouldExceed,
    ...(bucket?.id ? { bucketId: bucket.id } : {}),
    ...(bucket?.name ? { name: bucket.name } : {}),
    ...(limitCents != null ? { limitCents } : {}),
    ...(spentBeforeCents != null ? { spentBeforeCents } : {}),
    ...(spentAfterCents != null ? { spentAfterCents } : {}),
    ...(remainingAfterCents != null ? { remainingAfterCents } : {}),
  };

  const cardPayload: LegacyEngineDecision['card'] = {
    verdict: cardVerdict,
    hasCardData: Boolean(card),
    ...(card?.id ? { cardId: card.id } : {}),
    ...(card?.label ? { cardNickname: card.label } : {}),
    ...(multiplier != null ? { multiplier } : {}),
    ...(estimatedRewards != null ? { estimatedRewards } : {}),
  };

  return {
    category,
    amountCents,
    budget,
    card: cardPayload,
    overallVerdict,
    cherryIncentive,
  };
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { userId, mode } = await resolveUserContext({ requireAuth: false, allowLabDemo: true });
    assertUserId(userId, 'api/simulate POST');
    try {
      const parsed = await parseJsonBody(request, SimulateRequestSchema);
      if (!parsed.ok) return parsed.response;
      const body = parsed.data;

      const errors: string[] = [];
      const normalizedCategory =
        typeof body?.category === 'string' ? body.category.trim().toUpperCase() : '';

      if (typeof body?.amountCents !== 'number' || Number.isNaN(body.amountCents)) {
        errors.push('amountCents must be a number');
      } else if (body.amountCents <= 0) {
        errors.push('amountCents must be greater than 0');
      }

      if (!normalizedCategory || !validCategories.includes(normalizedCategory)) {
        errors.push('category must be a valid RewardCategory');
      }

      if (body?.merchantName != null && typeof body.merchantName !== 'string') {
        errors.push('merchantName must be a string');
      }

      if (body?.mccCode != null) {
        const asInt = Number.parseInt(String(body.mccCode), 10);
        if (!Number.isInteger(asInt) || String(asInt).length !== 4) {
          errors.push('mccCode must be a 4-digit integer if provided');
        }
      }

      if (errors.length > 0) {
        logWarn('Validation failed in /api/simulate', { userId, errors, body });
        return NextResponse.json(
          { error: 'Validation failed', details: errors },
          { status: 400 }
        );
      }

      const merchantName =
        typeof body?.merchantName === 'string' && body.merchantName.trim().length > 0
          ? body.merchantName.trim()
          : '';
      const mccCode =
        body?.mccCode != null && !Number.isNaN(Number(body.mccCode))
          ? Number.parseInt(String(body.mccCode), 10)
          : null;

      let simulationId = body.simulationId;
      if (!simulationId) {
        try {
          simulationId = (
            await prisma.simulation.create({
              data: { userId },
              select: { id: true },
            })
          ).id;
        } catch (err) {
          if (isPrismaP2003(err)) {
            logInvariant('P2003 while creating simulation', { userId, mode, meta: err.meta ?? null });
            return NextResponse.json(
              { error: 'Failed to create simulation (FK violation)' },
              { status: 500 }
            );
          }
          throw err;
        }
      }

      const ctx = buildEngineContext({
        surface: 'web',
        now: new Date(),
        merchantName: merchantName || null,
        merchantCategoryKey: normalizedCategory,
        mcc: mccCode != null ? String(mccCode) : null,
        amountCents: body.amountCents as number,
      });

      const engineResult = await safeSolveDecisionForUser(userId, ctx, { maxCandidates: 64 });
      if (!engineResult.ok) {
        logWarn('Engine failed in /api/simulate', { userId, mode, reason: engineResult.reason });
        return NextResponse.json(
          {
            simulationId,
            transaction: null,
            decision: null,
            error: {
              code: engineResult.reason,
              message: engineResult.message,
            },
          },
          { status: 200 }
        );
      }

      const topDecision = engineResult.decisions.at(0);
      const mappedDecision = mapSolverDecisionToLegacy({
        ...(topDecision ? { solverDecision: topDecision } : {}),
        state: engineResult.state,
        ctx,
        category: normalizedCategory as RewardCategory,
        ...(engineResult.legacyDecision ? { fallback: engineResult.legacyDecision } : {}),
      });

      if (!mappedDecision) {
        logWarn('Engine mapping failed in /api/simulate', { userId, mode });
        return NextResponse.json(
          {
            simulationId,
            transaction: null,
            decision: null,
            error: { code: 'ENGINE_MAPPING', message: 'Unable to build decision' },
          },
          { status: 200 }
        );
      }

      const decision: LegacyEngineDecision = mappedDecision;
      validateEngineDecision(decision);

      const strictDecline =
        (decision.budget.wouldExceed ?? false) && (decision.budget.strictMode ?? false);
      const bucketBeforeCents =
        decision.budget.limitCents != null && decision.budget.spentBeforeCents != null
          ? decision.budget.limitCents - decision.budget.spentBeforeCents
          : null;
      const bucketAfterCents = strictDecline
        ? bucketBeforeCents
        : decision.budget.remainingAfterCents ?? null;
      const bucketLimitCents = decision.budget.limitCents ?? null;
      const rewardMultiplier = decision.card.multiplier ?? null;
      const rewardsEarnedPoints = decision.card.estimatedRewards ?? null;
      try {
        const tx = await prisma.simulatedTransaction.create({
          data: {
            simulationId,
            userId,
            amount: body.amountCents as number,
            merchantName,
            resolvedCategory: decision.category,
            mccCode,

            bucketId: decision.budget.bucketId ?? null,
            bucketName: decision.budget.name ?? null,
            bucketPeriod: null,
            bucketBeforeCents,
            bucketAfterCents,
            bucketLimitCents,

            chosenCardId: decision.card.cardId ?? null,
            chosenCardName: decision.card.cardNickname ?? null,

            rewardMultiplier,
            rewardsEarned: rewardsEarnedPoints,
            multiplier: rewardMultiplier,
            cashbackPercent: null,
            rewardsEarnedPoints: rewardsEarnedPoints,
            rewardsEarnedCents: null,

            strictDecline,
            status: strictDecline ? TransactionStatus.DECLINED : TransactionStatus.APPROVED,
            reason: strictDecline ? 'STRICT_DECLINE' : 'APPROVED',
          },
        });

        return NextResponse.json({
          simulationId,
          transaction: tx,
          decision,
        });
      } catch (err) {
        if (isPrismaP2003(err)) {
          logInvariant('P2003 while creating simulated transaction', { userId, mode, meta: err.meta ?? null });
          return NextResponse.json(
            { error: 'Failed to save simulated transaction (FK violation)' },
            { status: 500 }
          );
        }
        throw err;
      }
    } catch (error) {
      logError('Error in /api/simulate', error);
      return NextResponse.json({ error: 'Failed to run simulation' }, { status: 500 });
    }
  } catch (error) {
    if (error instanceof Error && error.message?.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    logError('Error in /api/simulate', error);
    return NextResponse.json({ error: 'Failed to run simulation' }, { status: 500 });
  }
}
