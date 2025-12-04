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

    const verificationInput = {
      sessionId: parsed.data.sessionId,
      userId,
      amountCents: parsed.data.amountCents ?? null,
      merchantFingerprint: parsed.data.merchantFingerprint ?? null,
      occurredAt: new Date(),
      source: 'MANUAL' as const,
      ...(parsed.data.verified !== undefined ? { verified: parsed.data.verified } : {}),
    };

    const result = await verifySessionFromSignal(verificationInput);

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
