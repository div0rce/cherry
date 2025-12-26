import type { PrismaClient } from '@prisma/client';
import type { Database } from '../contracts/Database.js';

export class PrismaDatabase implements Database {
  prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }
}
