import type { JSX } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { resolveUserContext } from '@/lib/user-context';
import { RewardRuleForm } from '../../../../../_components/RewardRuleForm';
import { DeleteActionButton } from '../../../../../_components/DeleteActionButton';
import { deleteRewardRule, updateRewardRule } from './actions';

type PageParams = { cardId: string; ruleId: string };

export default async function EditRewardRulePage({
  params,
}: {
  params: Promise<PageParams> | PageParams;
}): Promise<JSX.Element> {
  const resolvedParams = params instanceof Promise ? await params : params;
  const { cardId, ruleId } = resolvedParams;
  const { userId } = await resolveUserContext({ requireAuth: true, allowLabDemo: true });

  const rule = await prisma.rewardRule.findFirst({
    where: { id: ruleId, card: { id: cardId, userId } },
    select: {
      id: true,
      category: true,
      multiplier: true,
      cashbackPercent: true,
      card: { select: { id: true, nickname: true } },
    },
  });

  if (!rule) {
    redirect('/app/onboarding?missing=rules');
  }

  const currentRule = rule;

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#f8fafc] to-[#e2e8f0]">
      <div className="mx-auto max-w-3xl px-4 py-10 space-y-6">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#ff4d6d]">Reward rules</p>
            <h1 className="text-2xl font-semibold text-[#0f172a]">Edit reward rule</h1>
            <p className="text-sm text-slate-600">
              Adjust the scope or rate for {currentRule.card.nickname}. Deleting the rule may block Autopilot if no other rules remain.
            </p>
          </div>
          <Link href="/app/onboarding" className="text-sm font-semibold text-[#ff4d6d]">
            ← Back to onboarding
          </Link>
        </div>

        <RewardRuleForm
          action={updateRewardRule}
          cardId={currentRule.card.id}
          defaultValues={{
            ruleId: currentRule.id,
            category: currentRule.category,
            multiplier: currentRule.multiplier,
            cashbackPercent: currentRule.cashbackPercent,
          }}
          submitLabel="Save changes"
          footerSlot={
            <DeleteActionButton
              action={deleteRewardRule}
              hiddenFields={{ cardId: currentRule.card.id, ruleId: currentRule.id }}
              label="Delete rule"
            />
          }
        />
      </div>
    </main>
  );
}
