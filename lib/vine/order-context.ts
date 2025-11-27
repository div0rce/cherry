export type OrderContextSource = 'VINE_SIM' | 'VINE_DEVICE' | 'APP_SCAN';

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
  source: OrderContextSource;
};
