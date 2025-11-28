import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import {
  CategoryCoverageModeDb,
  RecommendationStatus,
  RewardCategory,
  SessionAnomalyCode,
  VerificationStatus,
} from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { withUser } from '@/lib/with-user';
import { runEngine } from '@/lib/engine';
import { logError } from '@/lib/logger';
import { CreateSessionSchema } from '@/lib/schemas/sessions';
import { parseJsonBody } from '@/lib/validation';
import { validateEngineDecision } from '@/lib/engine-invariants';

export async function POST(request: NextRequest): Promise<NextResponse> {
  return withUser(request, async (userId) => {
    try {
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

      const decision = await runEngine({
        userId,
        amountCents,
        category: categoryHint as RewardCategory | null,
        merchantName,
        mccCode: mccCode ?? null,
      });
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
        select: { id: true },
      });

      return NextResponse.json({
        sessionId: session.id,
        decision,
      });
    } catch (error) {
      logError('Error in /api/sessions POST', error);
      return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
    }
  });
}
