// lib/prisma.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export function isProduction(): boolean {
  return process.env['NODE_ENV'] === 'production';
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['error', 'warn'],
  });

if (!isProduction()) {
  globalForPrisma.prisma = prisma;
}
