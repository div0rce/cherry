import { LAB_USER_EMAIL, LAB_USER_NAME } from '../user-context.js';
import type { BankIngestConfig } from '../config/server.js';
import { getServerConfig } from '../config/store.js';
import type { PrismaClient } from '@prisma/client';

type DevIngestUser = { id: string; email: string | null };

function isNonBlank(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '';
}

async function findRequiredUser(
  prisma: PrismaClient,
  where: { id: string } | { email: string },
  notFoundMessage: string
): Promise<DevIngestUser> {
  const user = await prisma.user.findUnique({ where });
  if (user === null) {
    throw new Error(notFoundMessage);
  }
  return { id: user.id, email: user.email ?? null };
}

export async function getDevIngestUser(
  prisma: PrismaClient,
  bankIngestConfig?: BankIngestConfig
): Promise<DevIngestUser> {
  const config = bankIngestConfig ?? getServerConfig().bankIngest;
  const envUserId = config.userId;
  const envEmail = config.userEmail;

  if (isNonBlank(envUserId)) {
    return findRequiredUser(
      prisma,
      { id: envUserId },
      `BANK_INGEST_USER_ID="${envUserId}" not found. Sign in or set BANK_INGEST_USER_EMAIL.`
    );
  }

  if (isNonBlank(envEmail)) {
    return findRequiredUser(
      prisma,
      { email: envEmail },
      `BANK_INGEST_USER_EMAIL="${envEmail}" not found. Sign in or correct the email.`
    );
  }

  // Fallback to lab user (warn).
  const lab = await prisma.user.upsert({
    where: { email: LAB_USER_EMAIL },
    update: {},
    create: { email: LAB_USER_EMAIL, name: LAB_USER_NAME },
  });
  console.warn(
    '[dev-user] BANK_INGEST_USER_ID/EMAIL not set; falling back to lab user',
    lab.id,
    lab.email
  );
  return { id: lab.id, email: lab.email ?? null };
}
