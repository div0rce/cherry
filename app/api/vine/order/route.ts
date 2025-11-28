import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { withUser } from '@/lib/with-user';
import { logError, logWarn } from '@/lib/logger';
import { runRecommendationFromOrderContext } from '@/lib/vine/run-recommendation';
import type { OrderContext } from '@/lib/vine/order-context';

type VineOrderRequest = Partial<{
  merchantName: string;
  amountCents: number;
  mccCode: number;
  deviceId: string;
  storeId: string;
  terminalId: string;
  orderId: string;
  nonce: string;
  currency: string;
}>;

export async function POST(request: NextRequest): Promise<NextResponse> {
  return withUser(request, async (userId) => {
    let body: VineOrderRequest;
    try {
      body = (await request.json()) as VineOrderRequest;
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const errors: string[] = [];

    if (!body.deviceId || typeof body.deviceId !== 'string' || body.deviceId.trim().length === 0) {
      errors.push('deviceId is required');
    }

    if (typeof body.amountCents !== 'number' || Number.isNaN(body.amountCents)) {
      errors.push('amountCents must be a number');
    } else if (body.amountCents <= 0) {
      errors.push('amountCents must be greater than 0');
    }

    if (body.merchantName != null && typeof body.merchantName !== 'string') {
      errors.push('merchantName must be a string when provided');
    }

    let mccCode: number | null = null;
    if (body.mccCode != null) {
      const parsed = Number.parseInt(String(body.mccCode), 10);
      if (!Number.isInteger(parsed) || String(parsed).length !== 4) {
        errors.push('mccCode must be a 4-digit integer when provided');
      } else {
        mccCode = parsed;
      }
    }

    if (errors.length > 0) {
      logWarn('Validation failed in /api/vine/order', { userId, errors, body });
      return NextResponse.json(
        { error: 'Validation failed', details: errors },
        { status: 400 }
      );
    }

    try {
      const orderContextBase: OrderContext = {
        deviceId: body.deviceId!.trim(),
        amountCents: Math.floor(body.amountCents as number),
        currency: 'USD',
        timestamp: Date.now(),
        source: 'VINE_SIM',
      };

      const orderContext: OrderContext = {
        ...orderContextBase,
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
