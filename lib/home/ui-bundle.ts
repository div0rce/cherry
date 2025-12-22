export type MonthStateBadgeTone = 'stable' | 'tight' | 'risky';

export type HomeUiBundle = {
  mode: {
    label: string;
    detail: string;
    simulationLabel: string;
    simulationDetail: string;
  };
  plan: {
    name: string;
    detail: string;
  };
  monthState: {
    title: string;
    badge: {
      label: string;
      tone: MonthStateBadgeTone;
    };
    primaryMetric: {
      kind: 'pace' | 'essentials_buffer' | 'safe_to_spend';
      label: string;
      value: string;
      helper: string;
    };
    bufferBar: {
      label: string;
      usedPercent: number;
      remainingLabel: string;
    };
    explanation: string;
    planDefinition: string;
    cta: { label: string; href: string };
  };
  headsUp: Array<{
    id: string;
    title: string;
    detail: string;
    severity: 'info' | 'caution' | 'risk';
  }>;
  bucketPreview: Array<{
    id: string;
    name: string;
    remaining: string;
    usedPercent: number;
  }>;
  upcoming: Array<{
    id: string;
    name: string;
    dateLabel: string;
    amountLabel?: string;
  }>;
  recent: Array<{
    id: string;
    title: string;
    detail: string;
    amountLabel: string;
    category: string;
  }>;
  emptyStates: {
    headsUp: string;
    bucketPreview: string;
    upcoming: string;
    recent: string;
  };
};

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return Number(value.toFixed(1));
}

function limitToThree<T>(items: T[]): T[] {
  return items.slice(0, 3);
}

export async function getHomeUiBundle(_userId: string): Promise<HomeUiBundle> {
  // Stub bundle: read-only render until engine wiring is ready. Do not inject authority.
  const bundle: HomeUiBundle = {
    mode: {
      label: 'Observe · Idle',
      detail: 'Cherry observes and reports. No holds or money movement.',
      simulationLabel: 'Simulated data',
      simulationDetail: 'Read-only state until bank data is connected.',
    },
    plan: {
      name: 'Essentials-first budget',
      detail: 'Reserve essentials; keep discretionary below caution bands.',
    },
    monthState: {
      title: 'This month',
      badge: { label: 'Stable posture', tone: 'stable' },
      primaryMetric: {
        kind: 'pace',
        label: 'Pace',
        value: 'On pace',
        helper: 'Spending is aligned with plan; no intervention needed.',
      },
      bufferBar: {
        label: 'Essentials buffer',
        usedPercent: clampPercent(32),
        remainingLabel: '$820 remaining',
      },
      explanation:
        'You are pacing within plan. Essentials buffer is intact.',
      planDefinition: 'Reserve $1,200 for essentials; keep discretionary under 70% until refill.',
      cta: { label: 'View details', href: '/app/month' },
    },
    headsUp: [
      {
        id: 'rent',
        title: 'Rent due in 5 days',
        detail: 'Essentials cover $1,200 rent on schedule.',
        severity: 'info',
      },
      {
        id: 'dining',
        title: 'Dining in caution band',
        detail: '78% used; further spend risks essentials reserve.',
        severity: 'caution',
      },
      {
        id: 'spike',
        title: 'Spend spike yesterday',
        detail: '$42 above your weekday median. Hold discretionary until trend clears.',
        severity: 'risk',
      },
    ],
    bucketPreview: [
      {
        id: 'essentials',
        name: 'Essentials',
        remaining: '$820',
        usedPercent: clampPercent(32),
      },
      {
        id: 'dining',
        name: 'Dining',
        remaining: '$140',
        usedPercent: clampPercent(78),
      },
      {
        id: 'transit',
        name: 'Transit',
        remaining: '$210',
        usedPercent: clampPercent(42),
      },
    ],
    upcoming: [
      { id: 'utilities', name: 'Utilities', dateLabel: 'Jan 20', amountLabel: '$130' },
      { id: 'subscriptions', name: 'Subscriptions', dateLabel: 'Jan 22', amountLabel: '$48' },
      { id: 'transfer', name: 'Transfer to savings', dateLabel: 'Jan 30', amountLabel: '$250' },
    ],
    recent: [
      {
        id: 'sim-1',
        title: 'Simulated purchase',
        detail: 'Dining · Din Tai Fung',
        amountLabel: '$42.18',
        category: 'Dining',
      },
      {
        id: 'sim-2',
        title: 'Simulated purchase',
        detail: 'Groceries · H Mart',
        amountLabel: '$86.40',
        category: 'Groceries',
      },
      {
        id: 'sim-3',
        title: 'Simulated purchase',
        detail: 'Transit · Clipper',
        amountLabel: '$24.00',
        category: 'Transit',
      },
    ],
    emptyStates: {
      headsUp: "No alerts. You’re on pace.",
      bucketPreview: 'Add buckets to see remaining balances.',
      upcoming: 'No upcoming obligations recorded.',
      recent: 'No recent decision events.',
    },
  };

  return {
    ...bundle,
    headsUp: limitToThree(bundle.headsUp),
    bucketPreview: limitToThree(bundle.bucketPreview),
    upcoming: limitToThree(bundle.upcoming),
    recent: limitToThree(bundle.recent),
  };
}
