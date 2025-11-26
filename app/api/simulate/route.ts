import { NextResponse } from 'next/server';
import { RewardCategory, TransactionStatus } from '@prisma/client';
import { withUser } from '@/lib/with-user';
import { prisma } from '@/lib/prisma';
import { evaluateTransaction } from '@/lib/engine';
import { logError, logWarn } from '@/lib/logger';

type Body = Partial<{
  amountCents: number;
  category: string;
  merchantName: string | null;
  simulationId: string;
  mccCode: number;
}>;

const validCategories = Object.values(RewardCategory) as string[];

export async function POST(request: Request) {
  return withUser(request, async (userId) => {
    try {
      const body = (await request.json()) as Body;

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

      const simulationId =
        body.simulationId ??
        (
          await prisma.simulation.create({
            data: { userId },
            select: { id: true },
          })
        ).id;

      const engineResult = await evaluateTransaction({
        userId,
        amountCents: body.amountCents as number,
        category: normalizedCategory as RewardCategory,
        merchantName,
      });

      const strictDecline = engineResult.bucket.strictDecline;
      const bucketBeforeCents = engineResult.bucket.remainingBeforeCents ?? null;
      const bucketAfterCents = strictDecline
        ? bucketBeforeCents
        : engineResult.bucket.remainingAfterCents ?? null;
        const bucketLimitCents = engineResult.bucket.limitCents ?? null;
        const rewardMultiplier = engineResult.routing.rewardMultiplier ?? null;
        const rewardsEarnedPoints = engineResult.routing.rewardsEarned ?? null;
        const tx = await prisma.$transaction(async (txPrisma) => {
          if (engineResult.bucket.id && !strictDecline && bucketAfterCents != null) {
            await txPrisma.bucket.update({
              where: { id: engineResult.bucket.id },
              data: { currentAmount: bucketAfterCents },
            });
          }

          return txPrisma.simulatedTransaction.create({
            data: {
              simulationId,
              userId,
              amount: body.amountCents as number,
              merchantName,
              resolvedCategory: normalizedCategory as RewardCategory,
              mccCode,

              bucketId: engineResult.bucket.id,
              bucketName: engineResult.bucket.name,
              bucketPeriod: engineResult.bucket.period,
              bucketBeforeCents,
              bucketAfterCents,
              bucketLimitCents,

              chosenCardId: engineResult.routing.chosenCardId,
              chosenCardName: engineResult.routing.chosenCardName,

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
        });

      return NextResponse.json({
        simulationId,
        transaction: tx,
        decision: engineResult,
      });
    } catch (error) {
      logError('Error in /api/simulate', error);
      return NextResponse.json({ error: 'Failed to run simulation' }, { status: 500 });
    }
  });
}
