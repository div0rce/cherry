import type { VineOrderSource } from '../enums';

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

function hasNonEmptyString(value?: string | null): value is string {
  return value !== undefined && value !== null && value !== '';
}

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
}, options: { fallbackTimestampMs: number }): OrderContext {
  const ctx: OrderContext = {
    deviceId: hasNonEmptyString(event.deviceId) ? event.deviceId : 'VINE-SIM',
    amountCents: Math.floor(event.amountCents),
    currency: (hasNonEmptyString(event.currency) ? event.currency : 'USD') as 'USD',
    mccCode: event.mccCode ?? null,
    timestamp: Number.isFinite(event.timestamp) ? event.timestamp : options.fallbackTimestampMs,
    source: (event.source ?? 'VINE_SIM') as VineOrderSource,
  };

  if (hasNonEmptyString(event.storeId)) ctx.storeId = event.storeId;
  if (hasNonEmptyString(event.terminalId)) ctx.terminalId = event.terminalId;
  if (hasNonEmptyString(event.orderId)) ctx.orderId = event.orderId;
  if (hasNonEmptyString(event.merchantName)) ctx.merchantName = event.merchantName;
  if (hasNonEmptyString(event.nonce)) ctx.nonce = event.nonce;

  return ctx;
}
