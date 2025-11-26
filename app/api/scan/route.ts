import { NextRequest, NextResponse } from 'next/server';
import { RewardCategory } from '@prisma/client';
import { withUser } from '@/lib/with-user';
import { evaluateTransaction } from '@/lib/engine';
import {
  computeCherryIncentive,
  inferCategoryForMerchant,
  classifySpendingVerdict,
} from '@/lib/scan-helpers';
import type { ScanRequestBody, ScanResponseBody } from '@/lib/scan-types';
import { logError } from '@/lib/logger';

export const POST = withUser(async (req: NextRequest, userId: string) => {
  let body: ScanRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.merchantName || typeof body.merchantName !== 'string') {
    return NextResponse.json(
      { error: 'merchantName is required and must be a string' },
      { status: 400 }
    );
  }

  let category: RewardCategory;
  if (body.category) {
    category = body.category;
  } else {
    category = (await inferCategoryForMerchant(userId, body.merchantName)) ?? RewardCategory.OTHER;
  }

  const amountCents =
    typeof body.expectedAmountCents === 'number' && Number.isFinite(body.expectedAmountCents)
      ? body.expectedAmountCents
      : 0;

  try {
    const decision = await evaluateTransaction({
      userId,
      amountCents,
      category,
      merchantName: body.merchantName,
    });

    const verdict = classifySpendingVerdict(decision);
    const incentive = computeCherryIncentive(decision, verdict);

    const bucket = decision.bucket;
    const routing = decision.routing;

    const response: ScanResponseBody = {
      merchantName: body.merchantName,
      category,
      amountCents,
      bucket: {
        name: bucket.name,
        limitCents: bucket.limitCents,
        spentBeforeCents: bucket.spentThisPeriodCents,
        spentAfterCents: bucket.willBeSpentCents,
        remainingAfterCents: bucket.remainingAfterCents,
        strictMode: bucket.strictDecline,
        wouldExceed: bucket.wouldExceed,
      },
      cardRecommendation: {
        cardId: routing.chosenCardId,
        cardNickname: routing.chosenCardName,
        rewardMultiplier: routing.rewardMultiplier,
        estimatedRewards: routing.rewardsEarned,
      },
      spendingVerdict: verdict,
      cherryIncentive: incentive,
      engineDecision: decision,
    };

    return NextResponse.json(response);
  } catch (error) {
    logError('Error in /api/scan', error);
    return NextResponse.json({ error: 'Failed to evaluate scan' }, { status: 500 });
  }
});
