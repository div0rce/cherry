import type { JSX } from 'react';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { CherryPointLedgerStatus, RecommendationStatus } from '@prisma/client';
import { authOptions } from '../../api/auth/[...nextauth]/route';
import BankSimulatorClient, { type PendingSession } from './client';
import { prisma } from '../../../lib/prisma';

export default async function BankSimulatorPage(): Promise<JSX.Element> {
  const session = await getServerSession(authOptions);
  if (session === null) {
    redirect(`/signin?callbackUrl=${encodeURIComponent('/bank-simulator')}`);
  }
  const userId = (session.user as { id?: string } | undefined)?.id;
  if (userId === undefined || userId === '') {
    redirect(`/signin?callbackUrl=${encodeURIComponent('/bank-simulator')}`);
  }

  const sessions = await prisma.recommendationSession.findMany({
    where: {
      userId,
      status: RecommendationStatus.CLAIMED,
      ledgerEntries: {
        some: {
          status: CherryPointLedgerStatus.PENDING,
        },
      },
    },
    include: {
      ledgerEntries: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  const initialSessions: PendingSession[] = sessions.map((sessionRow) => ({
    id: sessionRow.id,
    merchantName: sessionRow.merchantName,
    amountCents: sessionRow.amountCents,
    category: sessionRow.category,
    createdAt: sessionRow.createdAt.toISOString(),
    status: sessionRow.status,
    budgetVerdict: sessionRow.budgetVerdict,
    cardVerdict: sessionRow.cardVerdict,
    overallVerdict: sessionRow.overallVerdict,
    pendingPoints: sessionRow.ledgerEntries
      .filter((entry) => entry.status === CherryPointLedgerStatus.PENDING)
      .reduce((sum, entry) => sum + entry.points, 0),
  }));

  return <BankSimulatorClient initialSessions={initialSessions} />;
}
