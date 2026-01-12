import type { JSX } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { fetchFromApi, requireUserContext } from '../../../../../../../_lib/api';
import { RewardRuleForm } from '../../../../../_components/RewardRuleForm';
import { DeleteActionButton } from '../../../../../_components/DeleteActionButton';
import { deleteRewardRule, updateRewardRule } from './actions';
export const dynamic = 'force-dynamic';



type PageParams = { cardId: string; ruleId: string };

export default async function EditRewardRulePage({
  params,
}: {
  params: Promise<PageParams> | PageParams;
}): Promise<JSX.Element | null> {
  const resolvedParams = params instanceof Promise ? await params : params;
  const { cardId, ruleId } = resolvedParams;
  await requireUserContext();
  const ruleResponse = await fetchFromApi<
    Array<{
      id: string;
      category: string;
      multiplier: number | null;
      cashbackPercent: number | null;
    }>
  >(`/api/cards/${cardId}/rewards`);
  if (!ruleResponse.ok) {
    redirect('/app/onboarding?missing=rules');
    return null;
  }
  const rules = ruleResponse.data;
  const currentRule = rules.find((item) => item.id === ruleId) ?? null;
  if (currentRule === null) {
    redirect('/app/onboarding?missing=rules');
    return null;
  }

  const cardResponse = await fetchFromApi<Array<{ id: string; nickname: string }>>('/api/cards');
  if (!cardResponse.ok) {
    redirect('/app/onboarding?missing=cards');
    return null;
  }
  const cards = cardResponse.data;
  const card = cards.find((item) => item.id === cardId) ?? null;
  if (card === null) {
    redirect('/app/onboarding?missing=cards');
    return null;
  }

  return (
    <main className="min-h-screen bg-linear-to-b from-[#f8fafc] to-[#e2e8f0]">
      <div className="mx-auto max-w-3xl px-4 py-10 space-y-6">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#ff4d6d]">Reward rules</p>
            <h1 className="text-2xl font-semibold text-[#0f172a]">Edit reward rule</h1>
            <p className="text-sm text-slate-600">
              Adjust the scope or rate for {card.nickname}. Deleting the rule may block Autopilot if no other rules remain.
            </p>
          </div>
          <Link href="/app/onboarding" className="text-sm font-semibold text-[#ff4d6d]">
            ← Back to onboarding
          </Link>
        </div>

        <RewardRuleForm
          action={updateRewardRule}
          cardId={card.id}
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
              hiddenFields={{ cardId: card.id, ruleId: currentRule.id }}
              label="Delete rule"
            />
          }
        />
      </div>
    </main>
  );
}
