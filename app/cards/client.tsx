'use client';

import { useRouter } from 'next/navigation';
import { useState, FormEvent } from 'react';
import { signIn } from 'next-auth/react';

function promptSignIn(setStatus: (message: string) => void) {
  setStatus('Sign in to continue.');
  void signIn(undefined, { callbackUrl: window.location.href });
}

export function AddCardForm() {
  const router = useRouter();
  const [nickname, setNickname] = useState('');
  const [issuer, setIssuer] = useState('');
  const [network, setNetwork] = useState('');
  const [annualFeeDollars, setAnnualFeeDollars] = useState('');
  const [isCredit, setIsCredit] = useState(true);
  const [knowsRewards, setKnowsRewards] = useState(false);
  const [ruleCategory, setRuleCategory] = useState('DINING');
  const [ruleMultiplier, setRuleMultiplier] = useState('1');
  const [ruleType, setRuleType] = useState<'POINTS' | 'CASH'>('POINTS');
  const [ruleCapDollars, setRuleCapDollars] = useState('');
  const [status, setStatus] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!nickname.trim() || !issuer.trim() || !network.trim()) {
      setStatus('Please fill nickname, issuer, and network.');
      return;
    }

    if (annualFeeDollars.trim() !== '') {
      const parsed = Number.parseFloat(annualFeeDollars);
      if (!Number.isFinite(parsed) || parsed < 0) {
        setStatus('Annual fee must be a non-negative number.');
        return;
      }
    }

    if (knowsRewards) {
      if (!ruleCategory.trim()) {
        setStatus('Category is required for a reward rule.');
        return;
      }
      const parsedMultiplier = Number.parseFloat(ruleMultiplier);
      if (!Number.isFinite(parsedMultiplier) || parsedMultiplier <= 0) {
        setStatus(ruleType === 'CASH' ? 'Cash back % must be > 0.' : 'Points multiplier must be > 0.');
        return;
      }
      if (ruleCapDollars.trim() !== '') {
        const parsedCap = Number.parseFloat(ruleCapDollars);
        if (!Number.isFinite(parsedCap) || parsedCap < 0) {
          setStatus('Reward cap must be a non-negative number.');
          return;
        }
      }
    }

    setStatus('Saving…');

    const annualFeeCents =
      annualFeeDollars.trim() === ''
        ? null
        : Math.round(Number.parseFloat(annualFeeDollars) * 100);

    const res = await fetch('/api/cards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nickname,
        issuer,
        network,
        isCredit,
        annualFee: annualFeeCents,
      }),
    });

    if (res.status === 401) {
      promptSignIn(setStatus);
      return;
    }

    if (!res.ok) {
      const message = await res.text();
      setStatus(message || 'Failed to create card');
      return;
    }

    const createdCard = await res.json();

    if (knowsRewards) {
      const ruleCapCents =
        ruleCapDollars.trim() === ''
          ? null
          : Math.round(Number.parseFloat(ruleCapDollars) * 100);
      const parsedMultiplier = Number.parseFloat(ruleMultiplier);
      const multiplier =
        ruleType === 'CASH' ? Number((parsedMultiplier / 100).toFixed(6)) : parsedMultiplier;

      const ruleRes = await fetch(`/api/cards/${createdCard.id}/rewards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: ruleCategory,
          multiplier,
          capAmountCents: ruleCapCents,
        }),
      });

      if (ruleRes.status === 401) {
        promptSignIn(setStatus);
        return;
      }

      if (!ruleRes.ok) {
        const message = await ruleRes.text();
        setStatus(message || 'Card created, but failed to add reward rule.');
        router.refresh();
        return;
      }
    }

    setNickname('');
    setIssuer('');
    setNetwork('');
    setAnnualFeeDollars('');
    setIsCredit(true);
    setKnowsRewards(false);
    setRuleCategory('DINING');
    setRuleMultiplier('1');
    setRuleType('POINTS');
    setRuleCapDollars('');
    setStatus('Created!');
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-700">Nickname</label>
        <input
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          placeholder="Amex Gold"
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700">Issuer</label>
          <input
            value={issuer}
            onChange={(e) => setIssuer(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            placeholder="AMEX"
            required
          />
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700">Network</label>
          <input
            value={network}
            onChange={(e) => setNetwork(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            placeholder="AMEX"
            required
          />
        </div>
      </div>
      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-700">Annual fee (USD)</label>
        <input
          type="number"
          min="0"
          step="0.01"
          value={annualFeeDollars}
          onChange={(e) => setAnnualFeeDollars(e.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          placeholder="250.00"
        />
      </div>
      <div className="flex items-center gap-2">
        <input
          id="isCredit"
          type="checkbox"
          checked={isCredit}
          onChange={(e) => setIsCredit(e.target.checked)}
          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
        />
        <label htmlFor="isCredit" className="text-sm text-slate-700">
          Credit card (uncheck for debit)
        </label>
      </div>
      <div className="flex items-center gap-2">
        <input
          id="knowsRewards"
          type="checkbox"
          checked={knowsRewards}
          onChange={(e) => setKnowsRewards(e.target.checked)}
          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
        />
        <label htmlFor="knowsRewards" className="text-sm text-slate-700">
          I know the rewards structure and want to add a rule now
        </label>
      </div>
      {knowsRewards && (
        <div className="rounded-md border border-slate-200 bg-slate-50 p-3 space-y-2">
          <p className="text-sm font-semibold">Initial reward rule</p>
          <div className="grid grid-cols-4 gap-2">
            <div className="space-y-1">
              <label className="block text-xs uppercase tracking-[0.15em] text-slate-500">
                Category
              </label>
              <input
                value={ruleCategory}
                onChange={(e) => setRuleCategory(e.target.value.toUpperCase())}
                className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
                placeholder="DINING"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs uppercase tracking-[0.15em] text-slate-500">
                Reward type
              </label>
              <div className="flex rounded-md border border-slate-300 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setRuleType('CASH')}
                  className={`flex-1 px-2 py-1 text-sm ${
                    ruleType === 'CASH' ? 'bg-blue-50 text-blue-700' : 'text-slate-700'
                  }`}
                >
                  Cash back (%)
                </button>
                <button
                  type="button"
                  onClick={() => setRuleType('POINTS')}
                  className={`flex-1 px-2 py-1 text-sm ${
                    ruleType === 'POINTS' ? 'bg-blue-50 text-blue-700' : 'text-slate-700'
                  }`}
                >
                  Points (×)
                </button>
              </div>
            </div>
            <div className="space-y-1">
              <label className="block text-xs uppercase tracking-[0.15em] text-slate-500">
                {ruleType === 'CASH' ? 'Cash back %' : 'Points multiplier'}
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={ruleMultiplier}
                onChange={(e) => setRuleMultiplier(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
                placeholder={ruleType === 'CASH' ? '2.5' : '4'}
                required
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs uppercase tracking-[0.15em] text-slate-500">
                Cap (USD, optional)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={ruleCapDollars}
                onChange={(e) => setRuleCapDollars(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
                placeholder="500.00"
              />
            </div>
          </div>
          <p className="text-xs text-slate-500">
            Leave cap empty for uncapped; category must match your bucket/reward categories (e.g.,
            DINING, GROCERIES).
          </p>
        </div>
      )}
      <button
        type="submit"
        className="w-full rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition"
      >
        Add card
      </button>
      {status && <p className="text-xs text-slate-600">{status}</p>}
    </form>
  );
}

export function AddRewardRuleForm({ cardId }: { cardId: string }) {
  const router = useRouter();
  const [category, setCategory] = useState('DINING');
  const [multiplier, setMultiplier] = useState('1');
  const [rewardType, setRewardType] = useState<'POINTS' | 'CASH'>('POINTS');
  const [capAmountDollars, setCapAmountDollars] = useState('');
  const [status, setStatus] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!category.trim()) {
      setStatus('Category is required.');
      return;
    }

    const parsedMultiplier = Number.parseFloat(multiplier);
    if (!Number.isFinite(parsedMultiplier) || parsedMultiplier <= 0) {
      setStatus(
        rewardType === 'CASH'
          ? 'Cash back % must be > 0.'
          : 'Points multiplier must be > 0.'
      );
      return;
    }

    if (capAmountDollars.trim() !== '') {
      const parsedCap = Number.parseFloat(capAmountDollars);
      if (!Number.isFinite(parsedCap) || parsedCap < 0) {
        setStatus('Cap must be a non-negative number.');
        return;
      }
    }

    setStatus('Saving…');

    const capAmountCents =
      capAmountDollars.trim() === ''
        ? null
        : Math.round(Number.parseFloat(capAmountDollars) * 100);

    const numericMultiplier =
      rewardType === 'CASH'
        ? Number((parsedMultiplier / 100).toFixed(6))
        : parsedMultiplier;

    const res = await fetch(`/api/cards/${cardId}/rewards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category,
        multiplier: numericMultiplier,
        capAmountCents,
      }),
    });

    if (res.status === 401) {
      promptSignIn(setStatus);
      return;
    }

    if (!res.ok) {
      const message = await res.text();
      setStatus(message || 'Failed to create reward rule');
      return;
    }

    setStatus('Created!');
    setCapAmountDollars('');
    setMultiplier('1');
    setRewardType('POINTS');
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-2 text-sm">
      <input
        value={category}
        onChange={(e) => setCategory(e.target.value.toUpperCase())}
        className="w-24 rounded-md border border-slate-300 px-2 py-1"
        placeholder="DINING"
        required
      />

      <div className="flex rounded-md border border-slate-300 overflow-hidden">
        <button
          type="button"
          onClick={() => setRewardType('CASH')}
          className={`flex-1 px-2 py-1 ${
            rewardType === 'CASH' ? 'bg-blue-50 text-blue-700' : 'text-slate-700'
          }`}
        >
          Cash %
        </button>
        <button
          type="button"
          onClick={() => setRewardType('POINTS')}
          className={`flex-1 px-2 py-1 ${
            rewardType === 'POINTS' ? 'bg-blue-50 text-blue-700' : 'text-slate-700'
          }`}
        >
          Points ×
        </button>
      </div>

      <input
        type="number"
        min="0"
        step="0.01"
        value={multiplier}
        onChange={(e) => setMultiplier(e.target.value)}
        className="w-20 rounded-md border border-slate-300 px-2 py-1"
        placeholder={rewardType === 'CASH' ? '2.5' : '4'}
        required
      />
      <input
        type="number"
        min="0"
        step="0.01"
        value={capAmountDollars}
        onChange={(e) => setCapAmountDollars(e.target.value)}
        className="w-28 rounded-md border border-slate-300 px-2 py-1"
        placeholder="Cap (USD)"
      />
      <button
        type="submit"
        className="rounded-md bg-blue-600 px-3 py-1 text-white hover:bg-blue-700 transition"
      >
        Add rule
      </button>
      {status && <span className="text-xs text-slate-500">{status}</span>}
    </form>
  );
}

export function DeleteCardButton({ cardId }: { cardId: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<string | null>(null);

  async function handleDelete() {
    const confirmed = window.confirm('Delete this card? Reward rules will also be removed.');
    if (!confirmed) return;

    setStatus('Removing…');
    const res = await fetch('/api/cards', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cardId }),
    });

    if (res.status === 401) {
      promptSignIn(setStatus);
      return;
    }

    if (!res.ok) {
      const message = await res.text();
      setStatus(message || 'Failed to delete card');
      return;
    }

    setStatus(null);
    router.refresh();
  }

  return (
    <button
      onClick={handleDelete}
      className="text-sm text-red-600 hover:text-red-700"
      type="button"
    >
      Delete
      {status && <span className="ml-2 text-xs text-slate-500">{status}</span>}
    </button>
  );
}

export function DeleteRewardRuleButton({
  cardId,
  rewardRuleId,
}: {
  cardId: string;
  rewardRuleId: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<string | null>(null);

  async function handleDelete() {
    const confirmed = window.confirm('Delete this reward rule?');
    if (!confirmed) return;

    setStatus('Removing…');
    const res = await fetch(`/api/cards/${cardId}/rewards`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rewardRuleId }),
    });

    if (res.status === 401) {
      promptSignIn(setStatus);
      return;
    }

    if (!res.ok) {
      const message = await res.text();
      setStatus(message || 'Failed to delete');
      return;
    }

    setStatus(null);
    router.refresh();
  }

  return (
    <button
      onClick={handleDelete}
      className="text-xs text-red-600 hover:text-red-700"
      type="button"
    >
      Remove
      {status && <span className="ml-1 text-slate-500">{status}</span>}
    </button>
  );
}
