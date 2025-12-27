import { z } from 'zod';
import { isValidMcc, normalizeMcc } from '../mcc';

export const mccSchema = z
  .union([z.string(), z.number()])
  .transform((value) => normalizeMcc(value))
  .refine((value) => isValidMcc(value), {
    message: 'MCC must be a valid merchant category code from the mapping',
  });

export type MccValue = z.infer<typeof mccSchema>;
