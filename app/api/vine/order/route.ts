import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { withUser } from '@/lib/with-user';
import { logError } from '@/lib/logger';
import { runRecommendationFromOrderContext } from '@/lib/vine/run-recommendation';
import type { OrderContext } from '@/lib/vine/order-context';
import { mapTerminalEventToOrderContext } from '@/lib/vine/order-context';
import { OrderContextSchema } from '@/lib/schemas/vine';
import { VineOrderSource } from '@/lib/enums';
import { vineTerminalEventSchema } from '@/lib/schemas/vine-terminal';
import { isValidMcc } from '@/lib/mcc';
import { verifyVineSignature, type VineSignatureContext } from '@/lib/vine/security';
import { Prisma } from '@prisma/client';

export async function POST(request: NextRequest): Promise<NextResponse> {
  return withUser(request, async (userId) => {
    try {
      const raw: unknown = await request.json();

      let orderContext: OrderContext;

      const terminalParsed = vineTerminalEventSchema.safeParse(raw);
      if (terminalParsed.success) {
        const parsed = terminalParsed.data;
        const parsedMcc = parsed.merchant?.mcc ?? parsed.mcc;
        const parsedTimestamp =
          (parsed.timestampUtc ? Date.parse(parsed.timestampUtc) : Number.NaN) ??
          (parsed.timestampLocal ? Date.parse(parsed.timestampLocal) : Number.NaN);
        orderContext = mapTerminalEventToOrderContext({
          amountCents: Math.round(parsed.amount),
          currency: parsed.currency ?? 'USD',
          merchantName: parsed.merchant?.merchantName ?? null,
          storeId: parsed.merchant?.storeId ?? null,
          terminalId: parsed.terminal?.terminalId ?? null,
          mccCode:
            parsedMcc != null && Number.isFinite(Number.parseInt(parsedMcc, 10))
              ? Number.parseInt(parsedMcc, 10)
              : null,
          timestamp: Number.isFinite(parsedTimestamp) ? parsedTimestamp : Date.now(),
          deviceId: parsed.terminal?.terminalId ?? 'VINE-SIM',
          orderId: parsed.vine?.sessionId ?? null,
          nonce: null,
          source: parsed.vine?.source ?? VineOrderSource.VINE_SIM,
        });
      } else {
        const parsed = OrderContextSchema.safeParse(raw);
        if (!parsed.success) {
          return NextResponse.json(
            { error: 'invalid_payload', issues: parsed.error.issues },
            { status: 400 }
          );
        }
        orderContext = {
          deviceId: parsed.data.deviceId.trim(),
          amountCents: Math.floor(parsed.data.amountCents as number),
          currency: 'USD',
          timestamp: parsed.data.timestamp,
          source: parsed.data.source ?? VineOrderSource.VINE_SIM,
          ...(parsed.data.storeId ? { storeId: parsed.data.storeId.trim() } : {}),
          ...(parsed.data.terminalId ? { terminalId: parsed.data.terminalId.trim() } : {}),
          ...(parsed.data.orderId ? { orderId: parsed.data.orderId.trim() } : {}),
          ...(parsed.data.merchantName ? { merchantName: parsed.data.merchantName.trim() } : {}),
          ...(parsed.data.mccCode != null ? { mccCode: parsed.data.mccCode } : {}),
          ...(parsed.data.nonce ? { nonce: parsed.data.nonce.trim() } : {}),
        };
      }

      if (orderContext.mccCode != null && !isValidMcc(orderContext.mccCode)) {
        return NextResponse.json({ error: 'MCC must be a valid merchant category code' }, { status: 400 });
      }

      const nowMs = Date.now();
      const ageMs = nowMs - orderContext.timestamp;
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

      const result = await runRecommendationFromOrderContext(orderContext, userId);

      return NextResponse.json({
        sessionId: result.sessionId,
        decision: result.decision,
        orderToken: result.orderToken,
      });
    } catch (error) {
      if (error instanceof Error && error.message?.startsWith('VINE_RECO_USER_NOT_FOUND')) {
        return NextResponse.json(
          { error: 'vine_user_missing', message: error.message },
          { status: 500 }
        );
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        return NextResponse.json(
          { error: 'vine_fk_violation', meta: error.meta },
          { status: 500 }
        );
      }
      logError('Error in /api/vine/order', error);
      return NextResponse.json({ error: 'Failed to process order' }, { status: 500 });
    }
  });
}
