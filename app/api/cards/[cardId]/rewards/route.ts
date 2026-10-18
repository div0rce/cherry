// app/api/cards/[cardId]/rewards/route.ts
// Manage reward rules for a specific card. This lets us express "4x on DINING"
// style behavior the simulation engine can consume.

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import type { ZodSchema } from 'zod';
import type { Card } from '@prisma/client';
import { prisma } from '../../../../../lib/prisma.js';
import { RewardCategory } from '@prisma/client';
import { resolveUserContext, assertUserId, isPrismaP2003, logInvariant } from '../../../../../lib/user-context.js';
import type { UserContextMode } from '../../../../../lib/user-context.js';
import { asAppError, asLogMeta } from '../../../../../lib/errors.js';
import {
  RewardRuleCreateSchema,
  RewardRuleDeleteSchema,
  RewardRuleUpdateSchema,
} from '../../../../../lib/schemas/cards.js';
import { hasText } from '../../../../../lib/text.js';
import { isPositiveNumber } from '../../../../../lib/numbers.js';
import { logGuardrailEvent } from '../../../../../lib/log.js';
import { parseJsonBody } from '../../../../../lib/validation.js';
import { auth } from '../../../../../lib/auth.js';
import { withAuthErrors } from '../../../../../lib/with-user.js';

type RewardsParams = { params: Promise<{ cardId: string }> };

type RewardsContext = {
  userId: string;
  mode: UserContextMode;
  cardId: string;
  requestTimestamp: string;
};

type Step<T> = { ok: true; value: T } | { ok: false; response: NextResponse };

function logStop(ctx: RewardsContext, reason: string, detail?: Record<string, boolean>): void {
  logGuardrailEvent({
    userId: ctx.userId,
    surface: 'rewards',
    outcome: 'STOP',
    reason,
    ...(detail === undefined ? {} : { detail }),
    timestamp: ctx.requestTimestamp,
    timestampSource: 'boundary',
  });
}

/**
 * Resolve the user, read the cardId param, and reject a missing cardId with 400.
 */
async function openRewardsRequest(
  { params }: RewardsParams,
  method: string,
  requestTimestamp: string
): Promise<Step<RewardsContext>> {
  const { userId, mode } = await resolveUserContext({
    getSession: auth,
    requireAuth: true,
    allowLabDemo: false,
  });
  assertUserId(userId, `api/cards/[cardId]/rewards ${method}`);
  const { cardId } = await params;
  const ctx: RewardsContext = { userId, mode, cardId, requestTimestamp };

  if (!hasText(cardId)) {
    logStop(ctx, 'MISSING_CARD_ID');
    return { ok: false, response: new NextResponse('Invalid request', { status: 400 }) };
  }
  return { ok: true, value: ctx };
}

async function parseRewardsBody<T>(
  request: NextRequest,
  schema: ZodSchema<T>,
  ctx: RewardsContext
): Promise<Step<T>> {
  const parsed = await parseJsonBody(request, schema);
  if (parsed.ok !== true) {
    logStop(ctx, 'INVALID_PAYLOAD');
    return {
      ok: false,
      response: NextResponse.json({ error: 'Invalid request' }, { status: parsed.response.status }),
    };
  }
  return { ok: true, value: parsed.data };
}

/**
 * Fetch the card for the current user to prevent cross-user access and give a
 * clear 404 if someone posts to a card that does not exist.
 */
async function loadCardForUser(ctx: RewardsContext): Promise<Step<Card>> {
  const card = await prisma.card.findFirst({
    where: { id: ctx.cardId, userId: ctx.userId },
  });
  if (card === null) {
    logStop(ctx, 'CARD_NOT_FOUND');
    return { ok: false, response: new NextResponse('Card not found for user', { status: 404 }) };
  }
  return { ok: true, value: card };
}

function invalidFieldsResponse(ctx: RewardsContext, detail: Record<string, boolean>): NextResponse {
  logStop(ctx, 'INVALID_FIELDS', detail);
  return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
}

function isValidCategory(normalizedCategory: string): boolean {
  return Object.values(RewardCategory).includes(normalizedCategory as RewardCategory);
}

function isValidCap(capAmountCents: number | null | undefined): boolean {
  return capAmountCents === undefined || capAmountCents === null || isPositiveNumber(capAmountCents);
}

/**
 * Map a Prisma P2003 (FK) failure to a 500; rethrow anything else.
 */
function fkErrorResponse(err: unknown, ctx: RewardsContext, method: string): NextResponse {
  const appError = asAppError(err);
  if (isPrismaP2003(err)) {
    logInvariant(`P2003 in api/cards/[cardId]/rewards ${method}`, {
      userId: ctx.userId,
      mode: ctx.mode,
      meta: asLogMeta(err.meta),
      err,
    });
    return new NextResponse('User context or FK error', { status: 500 });
  }
  throw appError;
}

/**
 * GET /api/cards/[cardId]/rewards
 *
 * Lists reward rules for a given card (demo user scoped).
 */
async function handleGET(_request: NextRequest, context: RewardsParams): Promise<NextResponse> {
  const opened = await openRewardsRequest(context, 'GET', new Date().toISOString());
  if (!opened.ok) return opened.response;

  const card = await loadCardForUser(opened.value);
  if (!card.ok) return card.response;

  const rewardRules = await prisma.rewardRule.findMany({
    where: { cardId: card.value.id },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(rewardRules);
}

/**
 * POST /api/cards/[cardId]/rewards
 *
 * Creates a reward rule for the given card.
 * Expected JSON body:
 * {
 *   category: string,
 *   multiplier: number, // e.g., 4.0 for 4x
 *   capAmountCents?: number // optional cap; null means no cap
 * }
 */
async function handlePOST(request: NextRequest, context: RewardsParams): Promise<NextResponse> {
  const opened = await openRewardsRequest(context, 'POST', new Date().toISOString());
  if (!opened.ok) return opened.response;
  const ctx = opened.value;

  const parsed = await parseRewardsBody(request, RewardRuleCreateSchema, ctx);
  if (!parsed.ok) return parsed.response;
  const { capAmountCents } = parsed.value;
  const fields = checkCreateFields(parsed.value);
  if (!fields.valid) return invalidFieldsResponse(ctx, fields.flags);

  const card = await loadCardForUser(ctx);
  if (!card.ok) return card.response;

  try {
    const rewardRule = await prisma.rewardRule.create({
      data: {
        cardId: card.value.id,
        category: fields.normalizedCategory as RewardCategory,
        multiplier: fields.multiplier,
        capAmount: capAmountCents ?? null,
      },
    });

    return NextResponse.json(rewardRule, { status: 201 });
  } catch (err: unknown) {
    return fkErrorResponse(err, ctx, 'POST');
  }
}

/**
 * DELETE /api/cards/[cardId]/rewards
 *
 * Deletes a reward rule for the given card.
 * Expected JSON body:
 * {
 *   rewardRuleId: string
 * }
 */
async function handleDELETE(request: NextRequest, context: RewardsParams): Promise<NextResponse> {
  const opened = await openRewardsRequest(context, 'DELETE', new Date().toISOString());
  if (!opened.ok) return opened.response;
  const ctx = opened.value;

  const parsed = await parseRewardsBody(request, RewardRuleDeleteSchema, ctx);
  if (!parsed.ok) return parsed.response;
  const { rewardRuleId } = parsed.value;
  if (!hasText(rewardRuleId)) {
    logStop(ctx, 'MISSING_REWARD_RULE_ID');
    return new NextResponse('Invalid request', { status: 400 });
  }

  const card = await loadCardForUser(ctx);
  if (!card.ok) return card.response;

  const rule = await prisma.rewardRule.findFirst({
    where: { id: rewardRuleId, cardId: card.value.id },
  });
  if (rule === null) {
    logStop(ctx, 'REWARD_RULE_NOT_FOUND');
    return new NextResponse('Reward rule not found for card', { status: 404 });
  }

  try {
    await prisma.rewardRule.delete({
      where: { id: rule.id },
    });
  } catch (err: unknown) {
    return fkErrorResponse(err, ctx, 'DELETE');
  }

  return new NextResponse(null, { status: 204 });
}

/**
 * PATCH /api/cards/[cardId]/rewards
 *
 * Updates a reward rule for the given card.
 * Expected JSON body:
 * {
 *   rewardRuleId: string,
 *   category: string,
 *   multiplier?: number,
 *   cashbackPercent?: number,
 *   capAmountCents?: number | null
 * }
 */
async function handlePATCH(request: NextRequest, context: RewardsParams): Promise<NextResponse> {
  const opened = await openRewardsRequest(context, 'PATCH', new Date().toISOString());
  if (!opened.ok) return opened.response;
  const ctx = opened.value;

  const parsed = await parseRewardsBody(request, RewardRuleUpdateSchema, ctx);
  if (!parsed.ok) return parsed.response;
  const { rewardRuleId, capAmountCents } = parsed.value;
  const fields = checkPatchFields(parsed.value);
  if (!fields.valid) return invalidFieldsResponse(ctx, fields.flags);

  const card = await loadCardForUser(ctx);
  if (!card.ok) return card.response;

  const rewardRule = await prisma.rewardRule.findFirst({
    where: { id: rewardRuleId, cardId: card.value.id },
  });
  if (rewardRule === null) {
    return new NextResponse('Reward rule not found for card', { status: 404 });
  }

  try {
    const updated = await prisma.rewardRule.update({
      where: { id: rewardRule.id },
      data: {
        category: fields.normalizedCategory as RewardCategory,
        multiplier: fields.numericMultiplier,
        capAmount: capAmountCents ?? null,
      },
    });

    return NextResponse.json(updated);
  } catch (err: unknown) {
    return fkErrorResponse(err, ctx, 'PATCH');
  }
}

type CreateFields = {
  category: string;
  multiplier?: number | undefined;
  capAmountCents?: number | undefined;
};

function checkCreateFields({ category, multiplier, capAmountCents }: CreateFields) {
  const normalizedCategory = category.toUpperCase();
  const flags = {
    hasValidCategory: isValidCategory(normalizedCategory),
    hasValidMultiplier: isPositiveNumber(multiplier),
    hasValidCap: isValidCap(capAmountCents),
  };
  if (isPositiveNumber(multiplier) && Object.values(flags).every(Boolean)) {
    return { valid: true, normalizedCategory, multiplier } as const;
  }
  return { valid: false, flags } as const;
}

type PatchFields = {
  category: string;
  multiplier?: number | undefined;
  cashbackPercent?: number | undefined;
  capAmountCents?: number | null | undefined;
};

/**
 * PATCH accepts either a multiplier or a cashback percent; a valid multiplier wins.
 */
function checkPatchFields({ category, multiplier, cashbackPercent, capAmountCents }: PatchFields) {
  const normalizedCategory = category.toUpperCase();
  const hasValidMultiplier = isPositiveNumber(multiplier);
  const flags = {
    hasValidCategory: isValidCategory(normalizedCategory),
    hasValidMultiplier,
    hasValidCashback: isPositiveNumber(cashbackPercent),
    hasValidCap: isValidCap(capAmountCents),
  };
  const hasValidRate = hasValidMultiplier || flags.hasValidCashback;
  const valid = flags.hasValidCategory && hasValidRate && flags.hasValidCap;
  const numericMultiplier = hasValidMultiplier ? Number(multiplier) : Number(cashbackPercent) / 100;
  return { valid, flags, normalizedCategory, numericMultiplier };
}

export const GET = withAuthErrors(handleGET);
export const POST = withAuthErrors(handlePOST);
export const DELETE = withAuthErrors(handleDELETE);
export const PATCH = withAuthErrors(handlePATCH);
