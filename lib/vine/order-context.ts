import type { VineOrderSource } from '../enums.js';

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

const OPTIONAL_STRING_FIELDS = ['storeId', 'terminalId', 'orderId', 'merchantName', 'nonce'] as const;

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

  for (const field of OPTIONAL_STRING_FIELDS) {
    const value = event[field];
    if (hasNonEmptyString(value)) ctx[field] = value;
  }

  return ctx;
}
