/**
 * IMPORTANT: LEGAL/PCI BOUNDARY
 *
 * This model intentionally excludes forbidden cardholder data:
 * - No full PAN
 * - No CVV/CVC
 * - No PIN/PIN block
 * - No track data
 * - No EMV cryptographic blobs
 *
 * Only metadata that can be exported by merchant POS in a PCI-compliant fashion
 * is allowed here. If you need any forbidden fields, stop and re-evaluate.
 */
export type VineTerminalEnvironment = 'IN_STORE' | 'UNATTENDED' | 'MOBILE';

export type VineTerminalEntryMode = 'CHIP' | 'CONTACTLESS' | 'MAGSTRIPE' | 'KEYED';

export type VineCardBrand = 'VISA' | 'MASTERCARD' | 'AMEX' | 'DISCOVER' | 'OTHER';

export type VineCardProductType = 'CREDIT' | 'DEBIT' | 'PREPAID' | 'COMMERCIAL';

export type VineAuthResult = 'APPROVED' | 'DECLINED' | 'PARTIAL_APPROVAL';

export type VineDeclineReason = 'INSUFFICIENT_FUNDS' | 'DO_NOT_HONOR' | 'SUSPECTED_FRAUD' | 'OTHER';

export type VineTransactionType = 'PURCHASE' | 'REFUND' | 'PREAUTH' | 'COMPLETION' | 'REVERSAL';

export type VineSource = 'VINE_SIM' | 'VINE_DEVICE' | 'APP_SCAN';

/**
 * Canonical terminal → Vine payload.
 *
 * Bare minimum: amount + mcc.
 * Everything else is optional and only present if merchant consents
 * and their POS/puck integration exposes these fields.
 */
export interface VineTerminalEvent {
  // Required core
  amount: number;
  currency: string;
  mcc: string;

  // Optional timing
  timestampLocal?: string;
  timestampUtc?: string;
  sequenceNumber?: number;

  // Optional merchant
  merchant?: {
    merchantId?: string;
    merchantName?: string;
    mcc?: string; // override/echo of top-level mcc
    country?: string;
    state?: string;
    city?: string;
    postalCode?: string;
    storeId?: string;
  };

  // Optional terminal
  terminal?: {
    terminalId?: string;
    environment?: VineTerminalEnvironment;
    hardwareModel?: string;
    softwareVersion?: string;
    entryMode?: VineTerminalEntryMode;
  };

  // Optional non-sensitive card descriptors
  card?: {
    brand?: VineCardBrand;
    productType?: VineCardProductType;
    bin?: string; // first 6–8 digits
    last4?: string;
    cardPresent?: boolean;
  };

  // Optional auth result
  auth?: {
    network?: string;
    responseCode?: string;
    responseMessage?: string;
    approvalCode?: string;
    result?: VineAuthResult;
    declineReason?: VineDeclineReason;
    retries?: number;
  };

  // Optional semantics
  transaction?: {
    type?: VineTransactionType;
    ecommerce?: boolean;
    recurring?: boolean;
    subscription?: boolean;
  };

  // Vine metadata
  vine?: {
    sessionId?: string;
    source?: VineSource;
  };
}
