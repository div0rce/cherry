// app/api/cards/route.ts
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma.js';
import { Prisma, RewardCategory } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { CardCreateSchema, CardDeleteSchema } from '../../../lib/schemas/cards.js';
import { parseJsonBody } from '../../../lib/validation.js';
import { assertUserId } from '../../../lib/invariants.js';
import { logInvariant } from '../../../lib/logging.js';
import { resolveUserContext, isPrismaP2003 } from '../../../lib/user-context.js';
import { asAppError, isUnauthorized, asLogMeta } from '../../../lib/errors.js';
import { auth } from '../../../lib/auth.js';
import { withAuthErrors } from '../../../lib/with-user.js';

const ALLOWED_CATEGORIES = Object.values(RewardCategory);

const hasText = (value?: string | null): value is string =>
  value !== undefined && value !== null && value !== '';

type IncomingRewardRule = {
  category?: string;
  multiplier?: number;
  cashbackPercent?: number;
  capAmountCents?: number | null;
};

type ParsedRule = { category: RewardCategory; multiplier: number; capAmount: number | null };

type RuleResult = { ok: true; rule: ParsedRule } | { ok: false; message: string };

function resolveNumericMultiplier(multiplier: unknown, percent: unknown): number | null {
  if (multiplier != null) return Number(multiplier);
  if (percent != null) return Number(percent) / 100;
  return null;
}

function isValidCap(capAmountCents: unknown): boolean {
  if (capAmountCents == null) return true;
  return typeof capAmountCents === 'number' && capAmountCents > 0;
}

function normalizeRuleCategory(category: string | undefined): { ok: true; value: RewardCategory } | { ok: false; message: string } {
  if (!hasText(category)) {
    return { ok: false, message: 'Each reward rule needs a category string' };
  }
  const normalizedCategory = category.toUpperCase() as RewardCategory;
  if (!ALLOWED_CATEGORIES.includes(normalizedCategory)) {
    return {
      ok: false,
      message: `Invalid category "${category}". Allowed: ${ALLOWED_CATEGORIES.join(', ')}`,
    };
  }
  return { ok: true, value: normalizedCategory };
}

function rewardValueError(
  category: string,
  numericMultiplier: number | null,
  capAmountCents: unknown
): string | null {
  if (numericMultiplier === null) {
    return `Reward rule for ${category} needs multiplier or cashbackPercent`;
  }
  if (!Number.isFinite(numericMultiplier) || numericMultiplier <= 0) {
    return `Reward rule for ${category} has invalid multiplier`;
  }
  if (!isValidCap(capAmountCents)) {
    return `Reward rule for ${category} has invalid capAmountCents`;
  }
  return null;
}

function parseRewardRule(rule: unknown): RuleResult {
  if (typeof rule !== 'object' || rule === null) {
    return { ok: false, message: 'Each reward rule must be an object' };
  }
  const { category, multiplier, cashbackPercent, capAmountCents } = rule as IncomingRewardRule;
  // Accept both camel variants for percent.
  const percent = cashbackPercent ?? (rule as { cashBackPercent?: number }).cashBackPercent;

  const normalized = normalizeRuleCategory(category);
  if (!normalized.ok) return normalized;

  const numericMultiplier = resolveNumericMultiplier(multiplier, percent);
  const valueError = rewardValueError(category ?? '', numericMultiplier, capAmountCents);
  if (valueError !== null) return { ok: false, message: valueError };

  return {
    ok: true,
    rule: {
      category: normalized.value,
      multiplier: numericMultiplier as number,
      capAmount: capAmountCents ?? null,
    },
  };
}

function parseRewardRules(rawRules: unknown): {
  ok: true;
  rules: ParsedRule[];
} | { ok: false; message: string } {
  if (rawRules == null) {
    return { ok: true, rules: [] };
  }

  if (!Array.isArray(rawRules)) {
    return { ok: false, message: 'rewardRules must be an array' };
  }

  const parsed: ParsedRule[] = [];
  for (const rawRule of rawRules) {
    const result = parseRewardRule(rawRule);
    if (!result.ok) return { ok: false, message: result.message };
    parsed.push(result.rule);
  }

  return { ok: true, rules: parsed };
}

async function handleGET(_request: NextRequest): Promise<NextResponse> {
  const { userId } = await resolveUserContext({
    getSession: auth,
    requireAuth: true,
    allowLabDemo: false,
  });
  assertUserId(userId, 'api/cards GET');

  const cards = await prisma.card.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: { rewardRules: true },
  });
  return NextResponse.json(cards);
}

async function handlePOST(request: NextRequest): Promise<NextResponse> {
  const { userId, mode } = await resolveUserContext({
    getSession: auth,
    requireAuth: true,
    allowLabDemo: false,
  });
  assertUserId(userId, 'api/cards POST');

  try {
    const parsed = await parseJsonBody(request, CardCreateSchema);
    if (parsed.ok !== true) return parsed.response;
    const { nickname, issuer, network, isCredit, annualFee, rewardRules } = parsed.data;

    const nicknameStr = nickname.trim();
    const issuerStr = issuer.trim();
    const networkStr = network.trim();

    const parsedRules = parseRewardRules(rewardRules);
    if (parsedRules.ok !== true) {
      return new NextResponse(parsedRules.message, { status: 400 });
    }

    const data: Prisma.CardCreateInput = {
      user: { connect: { id: userId } },
      nickname: nicknameStr,
      issuer: issuerStr,
      network: networkStr,
      isCredit: Boolean(isCredit),
      annualFee: annualFee ?? null,
    };

    if (parsedRules.rules.length > 0) {
      data.rewardRules = {
        create: parsedRules.rules.map((rule) => ({
          category: rule.category,
          multiplier: rule.multiplier,
          capAmount: rule.capAmount,
        })),
      };
    }

    const card = await prisma.card.create({
      data,
      include: {
        rewardRules: true,
      },
    });

    return NextResponse.json(card, { status: 201 });
  } catch (error: unknown) {
    return createCardErrorResponse(error, userId, mode);
  }
}

function isRecordNotFound(error: unknown): boolean {
  return error instanceof PrismaClientKnownRequestError && error.code === 'P2025';
}

function createCardErrorResponse(error: unknown, userId: string, mode: string | null): NextResponse {
  asAppError(error);
  if (isRecordNotFound(error)) {
    return NextResponse.json({ error: 'User not found for card creation' }, { status: 404 });
  }
  if (isPrismaP2003(error)) {
    logInvariant('Card FK violation during create', {
      userId,
      mode,
      meta: asLogMeta(error.meta),
      err: error,
    });
    return NextResponse.json(
      { error: 'User foreign key violation while creating card' },
      { status: 500 }
    );
  }
  return NextResponse.json({ error: 'Failed to create card' }, { status: 500 });
}

async function deleteCard(
  cardId: string,
  userId: string,
  mode: string | null
): Promise<NextResponse> {
  try {
    await prisma.simulatedTransaction.updateMany({
      where: { chosenCardId: cardId, userId },
      data: { chosenCardId: null },
    });

    await prisma.card.delete({
      where: { id: cardId },
    });
  } catch (err: unknown) {
    const appError = asAppError(err);
    if (isPrismaP2003(err)) {
      logInvariant('Card FK violation during delete', {
        userId,
        mode,
        meta: asLogMeta(err.meta),
        err,
      });
      return new NextResponse('User foreign key violation while deleting card', { status: 500 });
    }
    throw appError;
  }
  return new NextResponse(null, { status: 204 });
}

async function handleDELETE(request: NextRequest): Promise<NextResponse> {
  const { userId, mode } = await resolveUserContext({
    getSession: auth,
    requireAuth: true,
    allowLabDemo: false,
  });
  assertUserId(userId, 'api/cards DELETE');
  try {
    const parsed = await parseJsonBody(request, CardDeleteSchema);
    if (parsed.ok !== true) return parsed.response;
    const { cardId } = parsed.data;

    if (!hasText(cardId)) {
      return new NextResponse('cardId is required', { status: 400 });
    }

    const card = await prisma.card.findFirst({
      where: { id: cardId, userId },
    });

    if (card === null) {
      return new NextResponse('Card not found for user', { status: 404 });
    }

    return await deleteCard(card.id, userId, mode);
  } catch (error: unknown) {
    const appError = asAppError(error);
    if (isUnauthorized(appError)) {
      return new NextResponse('Unauthorized', { status: 401 });
    }
    return new NextResponse('Failed to delete card', { status: 500 });
  }
}

export const GET = withAuthErrors(handleGET);
export const POST = withAuthErrors(handlePOST);
export const DELETE = withAuthErrors(handleDELETE);
