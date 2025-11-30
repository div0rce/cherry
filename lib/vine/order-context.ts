import type { VineOrderSource } from '@/lib/enums';

export type OrderContext = {
  deviceId: string;
  storeId?: string;
  terminalId?: string;
  orderId?: string;
  amountCents: number;
  currency?: 'USD';
  merchantName?: string;
  mccCode?: number | null;
  timestamp: number; // epoch ms
  nonce?: string;
  source: VineOrderSource;
};

export function mapTerminalEventToOrderContext(event: {
  amountCents: number;
  currency?: string | null;
  merchantName?: string | null;
  storeId?: string | null;
  terminalId?: string | null;
  mccCode?: number | null;
  timestamp: number;
  deviceId?: string | null;
  orderId?: string | null;
  nonce?: string | null;
  source?: VineOrderSource | null;
}): OrderContext {
  const ctx: OrderContext = {
    deviceId: event.deviceId ?? 'VINE-SIM',
    amountCents: Math.floor(event.amountCents),
    currency: (event.currency ?? 'USD') as 'USD',
    mccCode: event.mccCode ?? null,
    timestamp: Number.isFinite(event.timestamp) ? event.timestamp : Date.now(),
    source: (event.source ?? 'VINE_SIM') as VineOrderSource,
  };

  if (event.storeId) ctx.storeId = event.storeId;
  if (event.terminalId) ctx.terminalId = event.terminalId;
  if (event.orderId) ctx.orderId = event.orderId;
  if (event.merchantName) ctx.merchantName = event.merchantName;
  if (event.nonce) ctx.nonce = event.nonce;

  return ctx;
}
