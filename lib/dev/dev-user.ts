import { LAB_USER_EMAIL, LAB_USER_NAME } from '../user-context.js';
import type { BankIngestConfig } from '../config/server.js';
import { getServerConfig } from '../config/store.js';
import type { PrismaClient } from '@prisma/client';

export async function getDevIngestUser(
  prisma: PrismaClient,
  bankIngestConfig?: BankIngestConfig
): Promise<{ id: string; email: string | null }> {
  const config = bankIngestConfig ?? getServerConfig().bankIngest;
  const envUserId = config.userId;
  const envEmail = config.userEmail;

  const hasEnvUserId = typeof envUserId === 'string' && envUserId.trim() !== '';
  if (hasEnvUserId) {
    const user = await prisma.user.findUnique({ where: { id: envUserId } });
    if (!user) {
      throw new Error(`BANK_INGEST_USER_ID="${envUserId}" not found. Sign in or set BANK_INGEST_USER_EMAIL.`);
    }
    return { id: user.id, email: user.email ?? null };
  }

  const hasEnvEmail = typeof envEmail === 'string' && envEmail.trim() !== '';
  if (hasEnvEmail) {
    const user = await prisma.user.findUnique({ where: { email: envEmail } });
    if (!user) {
      throw new Error(`BANK_INGEST_USER_EMAIL="${envEmail}" not found. Sign in or correct the email.`);
    }
    return { id: user.id, email: user.email ?? null };
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
