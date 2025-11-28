import type { VineOrderSource } from '@/lib/enums';

export type OrderContext = {
  deviceId: string;
  storeId?: string;
  terminalId?: string;
  orderId?: string;
  amountCents: number;
  currency?: 'USD';
  merchantName?: string;
  mccCode?: number;
  timestamp: number; // epoch ms
  nonce?: string;
  source: VineOrderSource;
};
