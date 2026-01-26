import type { PrismaClient } from '@prisma/client';
import { AppError } from '../errors.js';

const REQUIRED_MODELS = [
  'bucket',
  'card',
  'rewardRule',
  'categoryPreference',
  'mccToRewardCategory',
  'dailyState',
  'recommendationSession',
  'cherryPointLedger',
  'decisionEvent',
] as const;

type RequiredModel = (typeof REQUIRED_MODELS)[number];

export function assertPrismaReady(prisma: PrismaClient): void {
  const missing: RequiredModel[] = [];
  const prismaRecord = prisma as unknown as Record<string, unknown>;
  for (const model of REQUIRED_MODELS) {
    const value = prismaRecord[model];
    if (value == null) {
      missing.push(model);
    }
  }
  if (missing.length > 0) {
    throw new AppError('INTERNAL', `Missing Prisma model: ${missing.join(', ')}`, 500, {
      missing,
    });
  }
}
