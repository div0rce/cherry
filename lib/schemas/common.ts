import { z } from 'zod';
import { $Enums } from '@prisma/client';

// Reward category
export const RewardCategorySchema = z.nativeEnum($Enums.RewardCategory);

// Verdicts and modes
export const CoverageModeSchema = z.nativeEnum($Enums.CategoryCoverageModeDb);
export const BudgetVerdictSchema = z.nativeEnum($Enums.BudgetVerdict);
export const CardVerdictSchema = z.nativeEnum($Enums.CardVerdict);
export const OverallVerdictSchema = z.nativeEnum($Enums.OverallVerdict);
export const RecommendationStatusSchema = z.nativeEnum($Enums.RecommendationStatus);

// Simple integer cents type
export const CentsSchema = z.number().int();
