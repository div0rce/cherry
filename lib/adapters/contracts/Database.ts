import type { PrismaClient } from '@prisma/client';

export interface Database {
  prisma: PrismaClient;
}
