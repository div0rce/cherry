import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { withUser } from '@/lib/with-user';
import { logError } from '@/lib/logger';
import { runRecommendationFromOrderContext } from '@/lib/vine/run-recommendation';
import type { OrderContext } from '@/lib/vine/order-context';
import { OrderContextSchema } from '@/lib/schemas/vine';
import { parseJsonBody } from '@/lib/validation';
import { VineOrderSource } from '@/lib/enums';
import { vineTerminalEventSchema } from '@/lib/schemas/vine-terminal';
import type { VineTerminalEventInput } from '@/lib/schemas/vine-terminal';
import { isValidMcc } from '@/lib/mcc';

export async function POST(request: NextRequest): Promise<NextResponse> {
  return withUser(request, async (userId) => {
    try {
      const raw: unknown = await request.json();
      let orderContext: OrderContext | null = null;

      const terminalParsed = vineTerminalEventSchema.safeParse(raw);
      if (terminalParsed.success) {
        orderContext = mapTerminalEventToOrderContext(terminalParsed.data);
      } else {
        const fallback = await parseJsonBody(request, OrderContextSchema);
        if (!fallback.ok) return fallback.response;
        const body = fallback.data;
        const mccCode =
          typeof body.mccCode === 'number' && Number.isInteger(body.mccCode) ? body.mccCode : null;
        orderContext = {
          deviceId: body.deviceId.trim(),
          amountCents: Math.floor(body.amountCents as number),
          currency: 'USD',
          timestamp: Date.now(),
          source: VineOrderSource.VINE_SIM,
          ...(typeof body.storeId === 'string' && body.storeId.trim().length > 0
            ? { storeId: body.storeId.trim() }
            : {}),
          ...(typeof body.terminalId === 'string' && body.terminalId.trim().length > 0
            ? { terminalId: body.terminalId.trim() }
            : {}),
          ...(typeof body.orderId === 'string' && body.orderId.trim().length > 0
            ? { orderId: body.orderId.trim() }
            : {}),
          ...(typeof body.merchantName === 'string' && body.merchantName.trim().length > 0
            ? { merchantName: body.merchantName.trim() }
            : {}),
          ...(mccCode != null ? { mccCode } : {}),
          ...(typeof body.nonce === 'string' && body.nonce.trim().length > 0
            ? { nonce: body.nonce.trim() }
            : {}),
        };
      }

      if (orderContext.mccCode == null || !Number.isInteger(orderContext.mccCode)) {
        return NextResponse.json({ error: 'Invalid MCC code' }, { status: 400 });
      }

      if (!isValidMcc(orderContext.mccCode)) {
        return NextResponse.json({ error: 'MCC must be a valid merchant category code' }, { status: 400 });
      }

      const result = await runRecommendationFromOrderContext(orderContext, userId);

      return NextResponse.json({
        sessionId: result.sessionId,
        decision: result.decision,
        orderToken: result.orderToken,
      });
    } catch (error) {
      logError('Error in /api/vine/order', error);
      return NextResponse.json({ error: 'Failed to process order' }, { status: 500 });
    }
  });
}

function mapTerminalEventToOrderContext(event: VineTerminalEventInput): OrderContext {
  const amountCents = Math.round(event.amount);
  const mccCode = Number.parseInt(event.mcc, 10);
  const timestamp =
    (event.timestampUtc ? Date.parse(event.timestampUtc) : Number.NaN) ??
    (event.timestampLocal ? Date.parse(event.timestampLocal) : Number.NaN);
  const derivedTimestamp = Number.isFinite(timestamp) ? timestamp : Date.now();

  if (!Number.isInteger(mccCode)) {
    throw new Error('Invalid MCC code; expected numeric 4 digits');
  }

  const ctx: OrderContext = {
    deviceId: event.terminal?.terminalId ?? 'VINE-SIM',
    amountCents,
    currency: 'USD',
    timestamp: derivedTimestamp,
    source: event.vine?.source ?? VineOrderSource.VINE_SIM,
  };

  if (event.merchant?.merchantName) ctx.merchantName = event.merchant.merchantName;
  if (event.merchant?.storeId) ctx.storeId = event.merchant.storeId;
  if (event.terminal?.terminalId) ctx.terminalId = event.terminal.terminalId;
  ctx.mccCode = mccCode;
  if (event.vine?.sessionId) ctx.orderId = event.vine.sessionId;

  return ctx;
}
