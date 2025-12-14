import type { JSX } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { resolveUserContext } from '@/lib/user-context';
import { RewardRuleForm } from '../../../../_components/RewardRuleForm';
import { createRewardRule } from './actions';

type PageParams = { cardId: string };

export default async function NewRewardRulePage({
  params,
}: {
  params: Promise<PageParams> | PageParams;
}): Promise<JSX.Element | null> {
  const resolvedParams = params instanceof Promise ? await params : params;
  const { cardId } = resolvedParams;
  const { userId } = await resolveUserContext({ requireAuth: true, allowLabDemo: true });

  const card = await prisma.card.findFirst({
    where: { id: cardId, userId },
    select: { id: true, nickname: true },
  });

  if (card === null) {
    redirect('/app/onboarding?missing=cards');
    return null;
  }

  const targetCard = card;

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#f8fafc] to-[#e2e8f0]">
      <div className="mx-auto max-w-3xl px-4 py-10 space-y-6">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#ff4d6d]">Reward rules</p>
            <h1 className="text-2xl font-semibold text-[#0f172a]">Add a reward rule</h1>
            <p className="text-sm text-slate-600">
              Map a simple rate to {targetCard.nickname}. A base (catch-all) rule is recommended so uncategorized
              spend still earns rewards.
            </p>
          </div>
          <Link href="/app/onboarding" className="text-sm font-semibold text-[#ff4d6d]">
            ← Back to onboarding
          </Link>
        </div>

        <RewardRuleForm action={createRewardRule} cardId={targetCard.id} submitLabel="Save rule" />
      </div>
    </main>
  );
}
