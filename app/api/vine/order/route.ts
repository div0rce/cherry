import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { withUser } from '@/lib/with-user';
import { logError, logWarn } from '@/lib/logger';
import { runRecommendationFromOrderContext } from '@/lib/vine/run-recommendation';
import type { OrderContext } from '@/lib/vine/order-context';
import { OrderContextSchema } from '@/lib/schemas/vine';
import { parseJsonBody } from '@/lib/validation';

export async function POST(request: NextRequest): Promise<NextResponse> {
  return withUser(request, async (userId) => {
    const parsed = await parseJsonBody(request, OrderContextSchema);
    if (!parsed.ok) return parsed.response;
    const body = parsed.data;

    const errors: string[] = [];

    if (!body.deviceId || body.deviceId.trim().length === 0) {
      errors.push('deviceId is required');
    }

    if (typeof body.amountCents !== 'number' || Number.isNaN(body.amountCents)) {
      errors.push('amountCents must be a number');
    } else if (body.amountCents <= 0) {
      errors.push('amountCents must be greater than 0');
    }

    if (errors.length > 0) {
      logWarn('Validation failed in /api/vine/order', { userId, errors, body });
      return NextResponse.json(
        { error: 'Validation failed', details: errors },
        { status: 400 }
      );
    }

    try {
      const mccCode =
        typeof body.mccCode === 'number' && Number.isInteger(body.mccCode) ? body.mccCode : null;

      const orderContext: OrderContext = {
        deviceId: body.deviceId.trim(),
        amountCents: Math.floor(body.amountCents as number),
        currency: 'USD',
        timestamp: Date.now(),
        source: 'VINE_SIM',
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
