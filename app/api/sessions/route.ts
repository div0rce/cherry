import { NextResponse } from 'next/server';
import {
  CategoryCoverageModeDb,
  RecommendationStatus,
  RewardCategory,
} from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { withUser } from '@/lib/with-user';
import { runEngine } from '@/lib/engine';
import { logError, logWarn } from '@/lib/logger';

type SessionRequestBody = Partial<{
  merchantName: string;
  amountCents: number;
  category: string | RewardCategory;
  mccCode: number;
  currency: string;
  deviceId: string;
  storeId: string;
  terminalId: string;
  orderId: string;
}>;

export async function POST(request: Request) {
  return withUser(request, async (userId) => {
    try {
      const body = (await request.json()) as SessionRequestBody;

      const errors: string[] = [];

      if (typeof body.amountCents !== 'number' || Number.isNaN(body.amountCents)) {
        errors.push('amountCents must be a number');
      } else if (body.amountCents <= 0) {
        errors.push('amountCents must be greater than 0');
      }

      if (body.merchantName != null && typeof body.merchantName !== 'string') {
        errors.push('merchantName must be a string when provided');
      }

      const categoryHint =
        typeof body.category === 'string' && body.category.trim().length > 0
          ? body.category.trim().toUpperCase()
          : null;

      let mccCode: number | null = null;
      if (body.mccCode != null) {
        const parsed = Number.parseInt(String(body.mccCode), 10);
        if (!Number.isInteger(parsed) || String(parsed).length !== 4) {
          errors.push('mccCode must be a 4-digit integer when provided');
        } else {
          mccCode = parsed;
        }
      }

      if (errors.length > 0) {
        logWarn('Validation failed in /api/sessions', { userId, errors, body });
        return NextResponse.json(
          { error: 'Validation failed', details: errors },
          { status: 400 }
        );
      }

      const merchantName =
        typeof body.merchantName === 'string' && body.merchantName.trim().length > 0
          ? body.merchantName.trim()
          : null;

      const amountCents = Math.floor(body.amountCents as number);

      const decision = await runEngine({
        userId,
        amountCents,
        category: categoryHint as RewardCategory | null,
        merchantName,
        mccCode: mccCode ?? undefined,
      });

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
