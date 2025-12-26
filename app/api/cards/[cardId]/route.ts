import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { CardUpdateSchema } from '@/lib/schemas/cards';
import { parseJsonBody } from '@/lib/validation';
import { assertUserId } from '@/lib/invariants';
import { resolveUserContext, isPrismaP2003 } from '@/lib/user-context';
import { logInvariant } from '@/lib/logging';
import { asError, asLogMeta } from '@/lib/errors';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ cardId: string }> }
): Promise<NextResponse> {
  const { userId, mode } = await resolveUserContext({ requireAuth: true, allowLabDemo: false });
  assertUserId(userId, 'api/cards/[cardId] PATCH');
  const { cardId } = await params;

  if (typeof cardId !== 'string' || cardId.length === 0) {
    return new NextResponse('cardId is required', { status: 400 });
  }

  const parsed = await parseJsonBody(request, CardUpdateSchema);
  if (!parsed.ok) return parsed.response;

  const card = await prisma.card.findFirst({
    where: { id: cardId, userId },
  });
  if (!card) {
    return new NextResponse('Card not found for user', { status: 404 });
  }

  try {
    const updated = await prisma.card.update({
      where: { id: card.id },
      data: {
        nickname: parsed.data.nickname.trim(),
        issuer: parsed.data.issuer.trim(),
        network: parsed.data.network.trim().toUpperCase(),
        isCredit: Boolean(parsed.data.isCredit),
        annualFee: parsed.data.annualFee ?? null,
      },
    });
    return NextResponse.json(updated);
  } catch (error) {
    asError(error);
    if (isPrismaP2003(error)) {
      logInvariant('Card FK violation during update', {
        userId,
        mode,
        meta: asLogMeta(error.meta),
        err: error,
      });
      return NextResponse.json(
        { error: 'User foreign key violation while updating card' },
        { status: 500 }
      );
    }
    return NextResponse.json({ error: 'Failed to update card' }, { status: 500 });
  }
}
