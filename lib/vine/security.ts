import crypto from 'crypto';
import { prisma } from '../prisma.js';
import type { VineDevice, PrismaClient } from '@prisma/client';
import { getServerConfig } from '../config/store.js';
import type { VineSignatureMode } from '../config/server.js';
import { logWarn } from '../logger.js';

const VINE_SIGNATURE_MODES: readonly VineSignatureMode[] = ['warn', 'enforce', 'off'];

function isVineSignatureMode(mode?: VineSignatureMode): mode is VineSignatureMode {
  return mode !== undefined && VINE_SIGNATURE_MODES.includes(mode);
}

export function getVineSignatureMode(mode?: VineSignatureMode): VineSignatureMode {
  if (isVineSignatureMode(mode)) return mode;
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

function isMissingSignature(signature: string | null | undefined): signature is null | undefined | '' {
  return signature === null || signature === undefined || signature === '';
}

function rejectOrWarn(
  ctx: VineSignatureContext,
  mode: VineSignatureMode,
  event: string,
  reason: string
): VineSignatureVerificationResult {
  if (mode === 'warn') {
    logWarn(event, { ctx, reason, mode });
    return { ok: true, mode, reason };
  }
  return { ok: false, mode, reason };
}

function deviceInvalidReason(device: VineDevice | null): string | null {
  if (device === null) return 'unknown_device';
  if (device.isActive !== true) return 'inactive_device';
  return null;
}

function signatureMatches(ctx: VineSignatureContext, secret: string, providedSignature: string): boolean {
  const message = buildVineSignatureMessage(ctx);
  const expected = crypto.createHmac('sha256', secret).update(message).digest('hex');
  const normalizedProvided = providedSignature.trim().toLowerCase();
  const normalizedExpected = expected.toLowerCase();
  return normalizedProvided === normalizedExpected;
}

export async function verifyVineSignature(
  ctx: VineSignatureContext,
  providedSignature: string | null | undefined,
  modeOverride?: VineSignatureMode
): Promise<VineSignatureVerificationResult> {
  const mode = getVineSignatureMode(modeOverride);
  if (mode === 'off') return { ok: true, mode };

  if (isMissingSignature(providedSignature)) {
    return rejectOrWarn(ctx, mode, 'vine_signature_missing', 'missing_signature');
  }

  const db: PrismaClient = prisma;
  const device: VineDevice | null = await db.vineDevice.findUnique({
    where: { deviceId: ctx.deviceId },
  });
  const invalidReason = deviceInvalidReason(device);
  if (device === null || invalidReason !== null) {
    return rejectOrWarn(ctx, mode, 'vine_device_invalid', invalidReason ?? 'unknown_device');
  }

  if (!signatureMatches(ctx, device.secret, providedSignature)) {
    return rejectOrWarn(ctx, mode, 'vine_signature_mismatch', 'signature_mismatch');
  }

  return { ok: true, mode };
}
