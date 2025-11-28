import { z } from 'zod';

export const SeedDemoRequestSchema = z.object({
  mode: z.enum(['FULL', 'LIGHT']).optional(),
});
