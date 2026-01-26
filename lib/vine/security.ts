import crypto from 'crypto';
import { prisma } from '../prisma.js';
import type { VineDevice, PrismaClient } from '@prisma/client';
import { getServerConfig } from '../config/store.js';
import type { VineSignatureMode } from '../config/server';

export function getVineSignatureMode(mode?: VineSignatureMode): VineSignatureMode {
  if (mode === 'warn' || mode === 'enforce' || mode === 'off') return mode;
  return getServerConfig().vineSignatureMode;
}

export type VineSignatureContext = {
  deviceId: string;
  amountCents: number;
  currency: string;
  timestamp: number;
  storeId?: string | null;
  terminalId?: string | null;
  orderId?: string | null;
};

export type VineSignatureVerificationResult = {
  ok: boolean;
  reason?: string;
  mode: VineSignatureMode;
};

export function buildVineSignatureMessage(ctx: VineSignatureContext): string {
  const { deviceId, amountCents, currency, timestamp, storeId, terminalId, orderId } = ctx;
  return [
    deviceId,
    amountCents.toString(),
    currency,
    timestamp.toString(),
    storeId ?? '',
    terminalId ?? '',
    orderId ?? '',
  ].join('|');
}

export async function verifyVineSignature(
  ctx: VineSignatureContext,
  providedSignature: string | null | undefined,
  modeOverride?: VineSignatureMode
): Promise<VineSignatureVerificationResult> {
  const mode = getVineSignatureMode(modeOverride);
  if (mode === 'off') return { ok: true, mode };

  if (providedSignature === null || providedSignature === undefined || providedSignature === '') {
    const reason = 'missing_signature';
    if (mode === 'warn') {
      console.warn('[Vine] signature missing', { ctx, reason });
      return { ok: true, mode, reason };
    }
    return { ok: false, mode, reason };
  }

  const db: PrismaClient = prisma;
  const device: VineDevice | null = await db.vineDevice.findUnique({
    where: { deviceId: ctx.deviceId },
  });
  if (!device || !device.isActive) {
    const reason = !device ? 'unknown_device' : 'inactive_device';
    if (mode === 'warn') {
      console.warn('[Vine] device invalid', { ctx, reason });
      return { ok: true, mode, reason };
    }
    return { ok: false, mode, reason };
  }

  const message = buildVineSignatureMessage(ctx);
  const expected = crypto.createHmac('sha256', device.secret).update(message).digest('hex');
  const normalizedProvided = providedSignature.trim().toLowerCase();
  const normalizedExpected = expected.toLowerCase();

  if (normalizedProvided !== normalizedExpected) {
    const reason = 'signature_mismatch';
    if (mode === 'warn') {
      console.warn('[Vine] signature mismatch', { ctx, reason });
      return { ok: true, mode, reason };
    }
    return { ok: false, mode, reason };
  }

  return { ok: true, mode };
}
