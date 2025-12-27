import { deriveStableId } from '../identity/hash';
import type { StableId } from '../identity/types';

type OrderTokenInput = {
  userId: string;
  amountCents: number;
  mccCode: number | null;
  merchantName: string | null;
  timestamp: number;
  deviceId?: string | null;
  terminalId?: string | null;
  storeId?: string | null;
  orderId?: string | null;
  nonce?: string | null;
};

export function deriveOrderToken(input: OrderTokenInput): StableId {
  return deriveStableId('vine', {
    userId: input.userId,
    amountCents: input.amountCents,
    mccCode: input.mccCode,
    merchantName: input.merchantName,
    timestamp: input.timestamp,
    deviceId: input.deviceId ?? null,
    terminalId: input.terminalId ?? null,
    storeId: input.storeId ?? null,
    orderId: input.orderId ?? null,
    nonce: input.nonce ?? null,
  });
}
