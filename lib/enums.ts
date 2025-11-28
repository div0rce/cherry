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
