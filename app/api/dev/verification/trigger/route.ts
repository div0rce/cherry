import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { withUser } from '@/lib/with-user';
import { z } from 'zod';
import { verifySessionFromSignal } from '@/lib/verification/verify-session';
import { parseJsonBody } from '@/lib/validation';

const TriggerVerificationSchema = z
  .object({
    sessionId: z.string().min(1),
    amountCents: z.number().int().optional(),
    merchantFingerprint: z.string().optional(),
    verified: z.boolean().optional(),
  })
  .strict();

export async function POST(request: NextRequest): Promise<NextResponse> {
  return withUser(request, async (userId, req) => {
    const parsed = await parseJsonBody(req, TriggerVerificationSchema);
    if (!parsed.ok) return parsed.response;

    const result = await verifySessionFromSignal({
      sessionId: parsed.data.sessionId,
      userId,
      amountCents: parsed.data.amountCents,
      merchantFingerprint: parsed.data.merchantFingerprint ?? null,
      verified: parsed.data.verified,
      occurredAt: new Date(),
      source: 'MANUAL',
    });

    if (!result.ok) {
      return NextResponse.json({ ok: false, reason: result.reason, message: result.message }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      sessionStatus: result.sessionStatus,
      ledgerStatus: result.ledgerStatus,
      reason: result.reason,
    });
  });
}
