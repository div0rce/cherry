import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import {
  CategoryCoverageModeDb,
  RecommendationStatus,
  RecommendationSource,
  RecommendationSession,
  RewardCategory,
  SessionAnomalyCode,
  VerificationStatus,
} from '@prisma/client';
import { prisma } from '@/lib/prisma';
import {
  buildEngineContext,
  mapSolverDecisionToLegacyDecision,
  safeSolveDecisionForUser,
  type LegacyEngineDecision,
} from '@/lib/engine';
import { logError } from '@/lib/logger';
import { CreateSessionSchema } from '@/lib/schemas/sessions';
import { parseJsonBody } from '@/lib/validation';
import { validateEngineDecision } from '@/lib/engine-invariants';
import { randomUUID } from 'crypto';
import { fetchSessionSummaries } from '@/lib/sessions/summaries';
import { assertUserId } from '@/lib/invariants';
import { logInvariant } from '@/lib/logging';
import { resolveUserContext, isPrismaP2003 } from '@/lib/user-context';

export async function POST(request: NextRequest): Promise<NextResponse> {
  let userId: string | null = null;
  let mode: string | null = null;

  try {
    const ctx = await resolveUserContext({ requireAuth: true, allowLabDemo: false });
    userId = ctx.userId;
    mode = ctx.mode;
  } catch (error) {
    if (error instanceof Error && error.message?.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    logError('Error resolving user context in /api/sessions POST', error);
    return NextResponse.json({ error: 'Failed to resolve user context' }, { status: 500 });
  }

  try {
    assertUserId(userId, 'api/sessions POST');
    const parsed = await parseJsonBody(request, CreateSessionSchema);
    if (!parsed.ok) return parsed.response;
    const body = parsed.data;

    const categoryHint =
      typeof body.category === 'string' && body.category.trim().length > 0
        ? body.category.trim().toUpperCase()
        : null;

    const merchantName =
      typeof body.merchantName === 'string' && body.merchantName.trim().length > 0
        ? body.merchantName.trim()
        : null;

    const amountCents = Math.floor(body.amountCents);
    const mccCode =
      typeof body.mccCode === 'number' && Number.isInteger(body.mccCode)
        ? body.mccCode
        : null;

    const ctxForEngine = buildEngineContext({
      surface: 'web',
      now: new Date(),
      merchantName,
      merchantCategoryKey: categoryHint ?? null,
      mcc: mccCode != null ? String(mccCode) : null,
      amountCents,
    });

    const engineResult = await safeSolveDecisionForUser(userId, ctxForEngine, { maxCandidates: 64 });

    if (!engineResult.ok) {
      return NextResponse.json(
        {
          sessionId: null,
          orderToken: null,
          expiresAt: null,
          source: RecommendationSource.APP_SCAN,
          error: {
            code: engineResult.reason,
            message: engineResult.message,
          },
        },
        { status: 200 }
      );
    }

    const topDecision =
      engineResult.decisions.find(
        (d) => d.action.type === 'USE_CARD' || d.action.type === 'USE_CARD_WITH_PAYDOWN'
      ) ?? engineResult.decisions.at(0);
    const mappedDecision: LegacyEngineDecision | null = mapSolverDecisionToLegacyDecision({
      ...(topDecision ? { solverDecision: topDecision } : {}),
      state: engineResult.state,
      ctx: ctxForEngine,
      category: (categoryHint as RewardCategory | null) ?? 'OTHER',
      ...(engineResult.legacyDecision ? { fallback: engineResult.legacyDecision } : {}),
    });

    if (!mappedDecision) {
      return NextResponse.json(
        {
          error: { code: 'ENGINE_MAPPING', message: 'Unable to build decision' },
          sessionId: null,
          orderToken: null,
          expiresAt: null,
          source: RecommendationSource.APP_SCAN,
        },
        { status: 200 }
      );
    }

    const decision: LegacyEngineDecision = mappedDecision;
    validateEngineDecision(decision);

    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    const currency = typeof body.currency === 'string' && body.currency.trim().length > 0
      ? body.currency.trim().toUpperCase()
      : 'USD';

    const session = await prisma.recommendationSession.create({
      data: {
        userId,
        merchantName,
        mccCode,
        category: decision.category,
        amountCents: decision.amountCents,
        currency,
        deviceId: body.deviceId ?? null,
        storeId: body.storeId ?? null,
        terminalId: body.terminalId ?? null,
        orderId: body.orderId ?? null,
        orderToken: randomUUID(),
        source: RecommendationSource.APP_SCAN,
        recommendedCardId: decision.card.cardId ?? null,
        recommendedBucketId: decision.budget.bucketId ?? null,
        verdict:
          decision.budget.verdict === 'BREAKS_BUDGET'
            ? 'BREAKS_BUDGET'
            : decision.budget.verdict === 'BORDERLINE'
              ? 'BORDERLINE'
              : 'HEALTHY',
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

    return NextResponse.json({
      sessionId: session.id,
      orderToken: session.orderToken,
      expiresAt: session.expiresAt,
      source: session.source,
      decision,
    });
  } catch (error: unknown) {
    if (isPrismaP2003(error)) {
      logInvariant('FK violation while creating recommendation session', {
        userId,
        mode,
        meta: error.meta ?? null,
      });
      return NextResponse.json(
        { error: 'Failed to create session (FK violation)' },
        { status: 500 }
      );
    }
    logError('Error in /api/sessions POST', error);
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  let userId: string | null = null;

  try {
    const ctx = await resolveUserContext({ requireAuth: true, allowLabDemo: false });
    userId = ctx.userId;
  } catch (error) {
    if (error instanceof Error && error.message?.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    logError('Error resolving user context in /api/sessions GET', error);
    return NextResponse.json({ error: 'Failed to resolve user context' }, { status: 500 });
  }

  try {
    assertUserId(userId, 'api/sessions GET');
    const params = request.nextUrl.searchParams;
    const limit = Math.min(Number(params.get('limit')) || 20, 100);
    const offset = Math.max(Number(params.get('offset')) || 0, 0);

    const statusParam = params.get('status') ?? 'all';
    const verdictParam = params.get('verdict');
    const fromParam = params.get('from');
    const toParam = params.get('to');
    const sourceParam = params.get('source');

    const verdicts =
      verdictParam?.split(',').map((v) => v.trim()).filter(Boolean) ?? [];

    const sources =
      sourceParam
        ?.split(',')
        .map((s) => s.trim())
        .filter(Boolean) as RecommendationSource[] | undefined;

    const fromDate = fromParam ? new Date(fromParam) : null;
    const toDate = toParam ? new Date(toParam) : null;

    const { items, hasMore } = await fetchSessionSummaries(userId, {
      limit,
      offset,
      status: (statusParam as 'all' | 'active' | 'expired' | 'confirmed') ?? 'all',
      verdict: verdicts.length > 0 ? (verdicts as RecommendationSession['verdict'][]) : null,
      from: fromDate,
      to: toDate,
      source: sources ?? null,
    });

    return NextResponse.json({
      items,
      pagination: {
        limit,
        offset,
        hasMore,
      },
    });
  } catch (error) {
    logError('Error in /api/sessions GET', error);
    return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
  }
}
