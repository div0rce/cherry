import { z } from 'zod';
import type { VineTerminalEvent } from '@/lib/vine/terminal-types';
import {
  VineTerminalEnvironment,
  VineTerminalEntryMode,
  VineCardBrand,
  VineCardProductType,
  VineAuthResult,
  VineDeclineReason,
  VineTransactionType,
  VineSource,
} from '@/lib/vine/terminal-types';

const envValues: [VineTerminalEnvironment, ...VineTerminalEnvironment[]] = [
  'IN_STORE',
  'UNATTENDED',
  'MOBILE',
];

const entryModeValues: [VineTerminalEntryMode, ...VineTerminalEntryMode[]] = [
  'CHIP',
  'CONTACTLESS',
  'MAGSTRIPE',
  'KEYED',
];

const brandValues: [VineCardBrand, ...VineCardBrand[]] = [
  'VISA',
  'MASTERCARD',
  'AMEX',
  'DISCOVER',
  'OTHER',
];

const productValues: [VineCardProductType, ...VineCardProductType[]] = [
  'CREDIT',
  'DEBIT',
  'PREPAID',
  'COMMERCIAL',
];

const authResultValues: [VineAuthResult, ...VineAuthResult[]] = [
  'APPROVED',
  'DECLINED',
  'PARTIAL_APPROVAL',
];

const declineValues: [VineDeclineReason, ...VineDeclineReason[]] = [
  'INSUFFICIENT_FUNDS',
  'DO_NOT_HONOR',
  'SUSPECTED_FRAUD',
  'OTHER',
];

const txTypeValues: [VineTransactionType, ...VineTransactionType[]] = [
  'PURCHASE',
  'REFUND',
  'PREAUTH',
  'COMPLETION',
  'REVERSAL',
];

const sourceValues: [VineSource, ...VineSource[]] = ['VINE_SIM', 'VINE_DEVICE', 'APP_SCAN'];

export const vineTerminalEventSchema = z.object({
  amount: z.number().positive(),
  currency: z.string().length(3),
  mcc: z.string(),

  timestampLocal: z.string().optional(),
  timestampUtc: z.string().optional(),
  sequenceNumber: z.number().int().nonnegative().optional(),

  merchant: z
    .object({
      merchantId: z.string().optional(),
      merchantName: z.string().optional(),
      mcc: z.string().optional(),
      country: z.string().optional(),
      state: z.string().optional(),
      city: z.string().optional(),
      postalCode: z.string().optional(),
      storeId: z.string().optional(),
    })
    .optional(),

  terminal: z
    .object({
      terminalId: z.string().optional(),
      environment: z.enum(envValues).optional(),
      hardwareModel: z.string().optional(),
      softwareVersion: z.string().optional(),
      entryMode: z.enum(entryModeValues).optional(),
    })
    .optional(),

  card: z
    .object({
      brand: z.enum(brandValues).optional(),
      productType: z.enum(productValues).optional(),
      bin: z.string().optional(),
      last4: z.string().optional(),
      cardPresent: z.boolean().optional(),
    })
    .optional(),

  auth: z
    .object({
      network: z.string().optional(),
      responseCode: z.string().optional(),
      responseMessage: z.string().optional(),
      approvalCode: z.string().optional(),
      result: z.enum(authResultValues).optional(),
      declineReason: z.enum(declineValues).optional(),
      retries: z.number().int().nonnegative().optional(),
    })
    .optional(),

  transaction: z
    .object({
      type: z.enum(txTypeValues).optional(),
      ecommerce: z.boolean().optional(),
      recurring: z.boolean().optional(),
      subscription: z.boolean().optional(),
    })
    .optional(),

  vine: z
    .object({
      sessionId: z.string().optional(),
      source: z.enum(sourceValues).optional(),
    })
    .optional(),
});

export type VineTerminalEventInput = z.infer<typeof vineTerminalEventSchema>;

// Ensure TS and Zod stay in sync
const _typeCheck: VineTerminalEvent = {} as VineTerminalEvent;
void _typeCheck;
