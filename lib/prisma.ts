// lib/prisma.ts
import { PrismaClient } from '@prisma/client';
import { getServerConfig } from './config/store';
import type { ServerConfig } from './config/server';

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function ensureServerConfig(): ServerConfig {
  return getServerConfig();
}

function createPrismaClient(databaseUrl: string): PrismaClient {
  if (typeof databaseUrl !== 'string' || databaseUrl.trim() === '') {
    throw new Error('Prisma initialization requires a databaseUrl');
  }
  return new PrismaClient({
    datasources: { db: { url: databaseUrl } },
    log: ['error', 'warn'],
  });
}

export function initPrisma(databaseUrl?: string): PrismaClient {
  if (globalForPrisma.prisma) return globalForPrisma.prisma;
  const config = ensureServerConfig();
  const url = databaseUrl ?? config.databaseUrl;
  globalForPrisma.prisma = createPrismaClient(url);
  return globalForPrisma.prisma;
}

export function setPrismaClient(client: PrismaClient): PrismaClient {
  globalForPrisma.prisma = client;
  return client;
}

export function getPrisma(): PrismaClient {
  if (!globalForPrisma.prisma) {
    return initPrisma();
  }
  return globalForPrisma.prisma;
}

export function isProduction(): boolean {
  return ensureServerConfig().environment === 'production';
}

// Proxy allows existing `prisma.<method>` imports without eager initialization.
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop: keyof PrismaClient) {
    const client = getPrisma();
    return client[prop];
  },
}) as PrismaClient;
