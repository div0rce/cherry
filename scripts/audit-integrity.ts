import { prisma } from '@/lib/prisma';
import {
  CherryPointLedgerStatus,
  LedgerAnomalyCode,
  RecommendationStatus,
  SessionAnomalyCode,
  VerificationStatus,
} from '@prisma/client';
import { logInfo, logWarn } from '@/lib/logger';

const LEDGER_STATUS_FOR_BALANCE = CherryPointLedgerStatus.POSTED;
const SESSION_EXPIRY_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

async function auditLedgerSums(): Promise<void> {
  const users = await prisma.user.findMany({ select: { id: true, email: true } });

  for (const user of users) {
    const ledgerSum = await prisma.cherryPointLedger.aggregate({
      where: { userId: user.id, status: LEDGER_STATUS_FOR_BALANCE },
      _sum: { points: true },
    });

    const totalPoints = ledgerSum._sum.points ?? 0;
    logInfo('Ledger posted points summary', {
      userId: user.id,
      email: user.email,
      postedPoints: totalPoints,
    });
  }
}

async function auditPendingSessions(): Promise<void> {
  const cutoff = Date.now() - SESSION_EXPIRY_TTL_MS;
  const pending = await prisma.recommendationSession.findMany({
    where: {
      verificationStatus: { in: [VerificationStatus.UNVERIFIED, VerificationStatus.PENDING] },
      status: RecommendationStatus.CLAIMED,
    },
    select: {
      id: true,
      userId: true,
      createdAt: true,
      anomalyCode: true,
      verificationStatus: true,
      anomalyDetails: true,
    },
  });

  for (const session of pending) {
    const createdMs = session.createdAt.getTime();
    if (createdMs <= cutoff) {
      await prisma.recommendationSession.update({
        where: { id: session.id },
        data: {
          verificationStatus: VerificationStatus.EXPIRED_UNVERIFIED,
          anomalyCode:
            session.anomalyCode === SessionAnomalyCode.NONE
              ? SessionAnomalyCode.TIME_WINDOW_VIOLATION
              : session.anomalyCode,
          anomalyDetails:
            session.anomalyCode === SessionAnomalyCode.NONE
              ? JSON.stringify({ expiredAt: new Date(cutoff).toISOString() })
              : session.anomalyDetails,
        },
      });

      await prisma.cherryPointLedger.updateMany({
        where: { sessionId: session.id },
        data: {
          isAnomalous: true,
          anomalyCode: LedgerAnomalyCode.SESSION_ANOMALOUS,
        },
      });

      logWarn('Expired pending session marked as anomalous', {
        sessionId: session.id,
        userId: session.userId,
      });
    }
  }
}

async function main(): Promise<void> {
  await auditLedgerSums();
  await auditPendingSessions();
}

main()
  .then(() => {
    logInfo('Audit complete');
  })
  .catch((error: unknown) => {
    logWarn('Audit failed', error);
    process.exit(1);
  });
