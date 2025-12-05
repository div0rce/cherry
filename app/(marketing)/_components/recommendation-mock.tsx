'use client';

import type { JSX } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/ui/cn';

type Scenario = {
  merchant: string;
  amount: string;
  category: string;
  card: string;
  perk: string;
  yearly: string;
  progress: number;
  tag: string;
  otherOptions: Array<{ label: string; delta: string }>;
};

const scenarios: Scenario[] = [
  {
    merchant: "Trader Joe's",
    amount: '$64.23',
    category: 'Groceries',
    card: 'Sapphire Preferred',
    perk: 'Groceries · 3x points',
    yearly: '+$112/year',
    progress: 0.52,
    tag: 'Save this',
    otherOptions: [
      { label: 'Everyday Cash · 2% back', delta: '+$48/year' },
      { label: 'Generic Visa · 1% back', delta: '+$16/year' },
    ],
  },
  {
    merchant: 'Delta.com',
    amount: '$482.10',
    category: 'Travel',
    card: 'Delta Reserve',
    perk: 'Airline · companion boost',
    yearly: '+$184/year',
    progress: 0.68,
    tag: 'Lock perks',
    otherOptions: [
      { label: 'Venture X · 2x miles', delta: '+$96/year' },
      { label: 'Everyday Cash · 2% back', delta: '+$54/year' },
    ],
  },
  {
    merchant: 'Whole Foods',
    amount: '$138.76',
    category: 'Groceries',
    card: 'Amex Gold',
    perk: '4x points · grocery',
    yearly: '+$228/year',
    progress: 0.74,
    tag: 'Max points',
    otherOptions: [
      { label: 'Amazon Visa · 5% store', delta: '+$144/year' },
      { label: 'Sapphire Preferred · 3x', delta: '+$92/year' },
    ],
  },
];

const cycleMs = 3400;

export function RecommendationMock(): JSX.Element {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % scenarios.length);
    }, cycleMs);
    return () => clearInterval(id);
  }, []);

  const scenario = useMemo(() => scenarios[index], [index]);

  return (
    <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-slate-50/80 p-5 shadow-sm backdrop-blur">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Upcoming purchase
          </p>
          <p className="text-lg font-semibold text-slate-900">{scenario.merchant}</p>
          <p className="text-xs text-slate-500">{scenario.category}</p>
        </div>
        <div className="text-right">
          <span className="inline-flex items-center rounded-full bg-[#D1193A]/10 px-2 py-0.5 text-[11px] font-semibold text-[#D1193A]">
            Live
          </span>
          <p className="mt-2 text-xl font-semibold text-slate-900">{scenario.amount}</p>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Cherry is choosing a card…
          </p>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-[#D1193A] transition-[width]"
              style={{ width: `${Math.round(scenario.progress * 100)}%` }}
            />
          </div>
        </div>

        <div
          key={scenario.card}
          className={cn(
            'flex items-center justify-between rounded-xl border border-[#0EA463]/30 bg-[#0EA463]/10 px-3 py-3 shadow-sm transition-all',
            'animate-[pulse_0.8s_ease-out]'
          )}
        >
          <div>
            <p className="text-sm font-semibold text-slate-900">{scenario.card}</p>
            <p className="text-xs text-[#0EA463]">{scenario.perk}</p>
          </div>
          <div className="text-right">
            <p className="text-[11px] uppercase tracking-wide text-[#0EA463]">{scenario.tag}</p>
            <p className="text-xs font-semibold text-slate-900">{scenario.yearly}</p>
          </div>
        </div>

        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Other options
          </p>
          <div className="space-y-2">
            {scenario.otherOptions.map((option) => (
              <div
                key={option.label}
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-[0_1px_0_rgba(15,23,42,0.06)]"
              >
                <p className="text-xs text-slate-700">{option.label}</p>
                <p className="text-[11px] text-slate-400">{option.delta}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-3">
        <p className="text-[11px] text-slate-500">Powered by Cherry&apos;s scoring engine</p>
        <span className="inline-flex items-center rounded-full bg-slate-900 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
          0 setup · 1 decision
        </span>
      </div>
    </div>
  );
}
