export type IncomeKind =
  | 'NONE'
  | 'PAYROLL'
  | 'ALLOWANCE'
  | 'SIDE_GIG'
  | 'REFUND'
  | 'INTERNAL_TRANSFER'
  | 'OTHER';

export type P2PKind =
  | 'NONE'
  | 'P2P_ALLOWANCE'
  | 'P2P_REPAYMENT_IN'
  | 'P2P_REPAYMENT_OUT'
  | 'P2P_PSEUDO_MERCHANT_IN'
  | 'P2P_PSEUDO_MERCHANT_OUT';

export type ClassifiedBankTransaction = {
  id: string;
  userId: string;
  amountMinor: number;
  direction: string;
  description: string | null;
  rawDescription: string | null;
  merchantName: string | null;
  merchantCity?: string | null;
  merchantRegion?: string | null;
  merchantCountry?: string | null;
  mcc: number | null;
  postedAt: Date;
  occurredAt: Date | null;
  source: string;
  section: string | null;
  incomeKind: IncomeKind;
  p2pKind: P2PKind;
};

export type MonthlyIncomeSnapshot = {
  monthStart: Date;
  totalCreditsCents: number;
  payrollCents: number;
  allowanceCents: number;
  sideGigCents: number;
  refundCents: number;
  internalTransferCents: number;
  otherCents: number;
  netEarnedIncomeCents: number;
};

export type IncomeRegimeDraft = {
  startMonth: Date;
  endMonth: Date;
  avgNetIncomeCents: number;
  avgFixedCostsCents: number;
  avgFreeCashCents: number;
  regimeLabel: string | null;
  months: Date[];
};
