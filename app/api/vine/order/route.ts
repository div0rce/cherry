import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { logError } from '../../../../lib/logger.js';
import { runRecommendationFromOrderContext } from '../../../../lib/vine/run-recommendation.js';
import { buildPrismaWorld } from '../../../../lib/adapters/runtime/world.prisma.js';
import type { OrderContext } from '../../../../lib/vine/order-context';
import { mapTerminalEventToOrderContext } from '../../../../lib/vine/order-context.js';
import { OrderContextSchema } from '../../../../lib/schemas/vine.js';
import { VineOrderSource } from '../../../../lib/enums.js';
import { vineTerminalEventSchema } from '../../../../lib/schemas/vine-terminal.js';
import { isValidMcc } from '../../../../lib/mcc.js';
import { verifyVineSignature, type VineSignatureContext } from '../../../../lib/vine/security.js';
import { resolveUserContext, assertUserId, logInvariant, isPrismaP2003 } from '../../../../lib/user-context.js';
import { parseJsonBody } from '../../../../lib/validation.js';
import { z } from 'zod';
import { asAppError, isUnauthorized, asLogMeta } from '../../../../lib/errors.js';

const VinePayloadSchema = z.union([vineTerminalEventSchema, OrderContextSchema]);
const hasText = (value?: string | null): value is string =>
  value !== undefined && value !== null && value !== '';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestReceivedAt = new Date();
  const requestTimestampMs = requestReceivedAt.getTime();
  try {
    const { userId, mode } = await resolveUserContext({ requireAuth: false, allowLabDemo: true });
    assertUserId(userId, 'api/vine/order POST');
    const parsedPayload = await parseJsonBody(request, VinePayloadSchema);
    if (!parsedPayload.ok) return parsedPayload.response;

    const body = parsedPayload.data;

    let orderContext: OrderContext;
    if ('amount' in body) {
      const parsedMcc = body.merchant?.mcc ?? body.mcc;
      const parsedTimestampUtc = hasText(body.timestampUtc) ? Date.parse(body.timestampUtc) : Number.NaN;
      const parsedTimestampLocal = hasText(body.timestampLocal) ? Date.parse(body.timestampLocal) : Number.NaN;
      const parsedTimestamp = Number.isFinite(parsedTimestampUtc)
        ? parsedTimestampUtc
        : parsedTimestampLocal;
      orderContext = mapTerminalEventToOrderContext({
        amountCents: Math.round(body.amount),
        currency: body.currency ?? 'USD',
        merchantName: body.merchant?.merchantName ?? null,
        storeId: body.merchant?.storeId ?? null,
        terminalId: body.terminal?.terminalId ?? null,
        mccCode:
          parsedMcc != null && Number.isFinite(Number.parseInt(parsedMcc, 10))
            ? Number.parseInt(parsedMcc, 10)
            : null,
        timestamp: Number.isFinite(parsedTimestamp) ? parsedTimestamp : requestTimestampMs,
        deviceId: body.terminal?.terminalId ?? 'VINE-SIM',
        orderId: body.vine?.sessionId ?? null,
        nonce: null,
        source: body.vine?.source ?? VineOrderSource.VINE_SIM,
      }, { fallbackTimestampMs: requestTimestampMs });
    } else {
      const validatedTimestamp = Number.isFinite(body.timestamp) ? body.timestamp : requestTimestampMs;
      orderContext = {
        deviceId: hasText(body.deviceId) ? body.deviceId.trim() : 'VINE-SIM',
        amountCents: Math.floor(body.amountCents as number),
        currency: 'USD',
        timestamp: validatedTimestamp,
        source: body.source ?? VineOrderSource.VINE_SIM,
        ...(hasText(body.storeId) ? { storeId: body.storeId.trim() } : {}),
        ...(hasText(body.terminalId) ? { terminalId: body.terminalId.trim() } : {}),
        ...(hasText(body.orderId) ? { orderId: body.orderId.trim() } : {}),
        ...(hasText(body.merchantName) ? { merchantName: body.merchantName.trim() } : {}),
        ...(body.mccCode != null ? { mccCode: body.mccCode } : {}),
        ...(hasText(body.nonce) ? { nonce: body.nonce.trim() } : {}),
      };
    }

    if (orderContext.mccCode != null && !isValidMcc(orderContext.mccCode)) {
      return NextResponse.json({ error: 'MCC must be a valid merchant category code' }, { status: 400 });
    }

    const ageMs = requestTimestampMs - orderContext.timestamp;
    const maxAgeMs = 3 * 60 * 1000; // TODO: tune freshness window
    if (ageMs > maxAgeMs) {
      return NextResponse.json(
        { error: 'stale_order', ageMs },
        { status: 400 }
      );
    }
    const signatureHeader = request.headers.get('x-vine-signature');
    const sigCtx: VineSignatureContext = {
      deviceId: orderContext.deviceId,
      amountCents: orderContext.amountCents,
      currency: orderContext.currency ?? 'USD',
      timestamp: orderContext.timestamp,
      storeId: orderContext.storeId ?? null,
      terminalId: orderContext.terminalId ?? null,
      orderId: orderContext.orderId ?? null,
    };
    const sigResult = await verifyVineSignature(sigCtx, signatureHeader);
    if (!sigResult.ok) {
      return NextResponse.json(
        { error: 'vine_signature_invalid', reason: sigResult.reason ?? 'invalid_signature' },
        { status: 401 }
      );
    }

    try {
      const world = buildPrismaWorld();
      const result = await runRecommendationFromOrderContext(world, orderContext, userId, {
        now: requestReceivedAt,
      });

      return NextResponse.json({
        sessionId: result.sessionId,
        decision: result.decision,
        orderToken: result.orderToken,
        authority: result.authority,
      });
    } catch (err: unknown) {
      const appError = asAppError(err);
      if (isPrismaP2003(err)) {
        logInvariant('P2003 in api/vine/order POST', {
          userId,
          mode,
          meta: asLogMeta(err.meta),
          err,
        });
      } else {
        logInvariant('Error in api/vine/order POST', { userId, mode, err: appError });
      }
      return NextResponse.json({ error: 'User context or FK error' }, { status: 500 });
    }
  } catch (error: unknown) {
    const appError = asAppError(error);
    if (isUnauthorized(appError)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    logError('Error in /api/vine/order', appError);
    return NextResponse.json({ error: 'Failed to process order' }, { status: 500 });
  }
}
