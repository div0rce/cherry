// Centralized Prisma enum aliases to avoid drift between code and schema.
import { $Enums } from '@prisma/client';

export type OverallVerdict = $Enums.OverallVerdict;
export type BudgetVerdict = $Enums.BudgetVerdict;
export type CardVerdict = $Enums.CardVerdict;
export type RecommendationStatus = $Enums.RecommendationStatus;
export type CherryPointLedgerStatus = $Enums.CherryPointLedgerStatus;
export type CategoryCoverageModeDb = $Enums.CategoryCoverageModeDb;
export type SessionAnomalyCode = $Enums.SessionAnomalyCode;
export type LedgerAnomalyCode = $Enums.LedgerAnomalyCode;
export type VerificationStatus = $Enums.VerificationStatus;
export type RecommendationSource = $Enums.RecommendationSource;

export const VineOrderSource = {
  VINE_SIM: 'VINE_SIM',
  VINE_DEVICE: 'VINE_DEVICE',
  APP_SCAN: 'APP_SCAN',
} as const;

export type VineOrderSource = (typeof VineOrderSource)[keyof typeof VineOrderSource];
