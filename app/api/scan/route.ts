import { NextRequest, NextResponse } from 'next/server';
import { RewardCategory } from '@prisma/client';
import { withUser } from '@/lib/with-user';
import { runEngine } from '@/lib/engine';
import { inferCategoryForMerchant } from '@/lib/scan-helpers';
import type { ScanRequestBody, ScanResponseBody } from '@/lib/scan-types';
import { logError } from '@/lib/logger';

export async function POST(request: NextRequest): Promise<NextResponse> {
  return withUser(request, async (userId) => {
    let body: ScanRequestBody;
    try {
      const raw = (await request.json()) as unknown;
      if (raw === null || typeof raw !== 'object') {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
      }
      body = raw as ScanRequestBody;
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    if (!body.merchantName || typeof body.merchantName !== 'string') {
      return NextResponse.json(
        { error: 'merchantName is required and must be a string' },
        { status: 400 }
      );
    }

    const categoryHint = body.category
      ? body.category
      : (await inferCategoryForMerchant(userId, body.merchantName)) ?? RewardCategory.OTHER;

    const amountCents =
      typeof body.expectedAmountCents === 'number' &&
      Number.isFinite(body.expectedAmountCents) &&
      body.expectedAmountCents >= 0
        ? Math.floor(body.expectedAmountCents)
        : 0;

    if (amountCents <= 0) {
      return NextResponse.json(
        { error: 'expectedAmountCents must be greater than 0' },
        { status: 400 }
      );
    }

    try {
      const decision = await runEngine({
        userId,
        amountCents,
        category: categoryHint,
        merchantName: body.merchantName,
      });

      const bucket = decision.budget;
      const routing = decision.card;

      const response: ScanResponseBody = {
        merchantName: body.merchantName,
        category: decision.category,
        amountCents,
        bucket: {
          name: bucket.name ?? null,
          limitCents: bucket.limitCents ?? null,
          spentBeforeCents: bucket.spentBeforeCents ?? null,
          spentAfterCents: bucket.spentAfterCents ?? null,
          remainingAfterCents: bucket.remainingAfterCents ?? null,
          strictMode: bucket.strictMode ?? false,
          wouldExceed: bucket.wouldExceed ?? false,
          coverageMode: bucket.coverageMode,
          verdict: bucket.verdict,
        },
        cardRecommendation: {
          cardId: routing.cardId ?? null,
          cardNickname: routing.cardNickname ?? null,
          rewardMultiplier: routing.multiplier ?? null,
          estimatedRewards: routing.estimatedRewards ?? null,
          verdict: routing.verdict,
        },
        budgetVerdict: decision.budget.verdict,
        cardVerdict: decision.card.verdict,
        overallVerdict: decision.overallVerdict,
        cherryIncentive: decision.cherryIncentive,
        engineDecision: decision,
      };

      return NextResponse.json(response);
    } catch (error) {
      logError('Error in /api/scan', error);
      return NextResponse.json({ error: 'Failed to evaluate scan' }, { status: 500 });
    }
  });
}
