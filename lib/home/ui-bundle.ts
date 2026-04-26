export type HomeUiBundle = {
  hasLiveData: false;
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
      tone: 'stable' | 'tight' | 'risky';
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
    cta: {
      label: string;
      href: string;
    };
  };
  headsUp: {
    id: string;
    title: string;
    detail: string;
    severity: 'info' | 'caution' | 'risk';
  }[];
  bucketPreview: {
    id: string;
    name: string;
    remaining: string;
    usedPercent: number;
  }[];
  upcoming: {
    id: string;
    name: string;
    dateLabel: string;
    amountLabel?: string;
  }[];
  recent: {
    id: string;
    title: string;
    detail: string;
    amountLabel: string;
    category: string;
  }[];
  emptyStates: {
    headsUp: string;
    bucketPreview: string;
    upcoming: string;
    recent: string;
  };
};

export async function getHomeUiBundle(_userId: string): Promise<HomeUiBundle> {
  return {
    hasLiveData: false,
    mode: {
      label: 'Mode: Advisory only',
      detail: 'Cherry can show context, but it will not move money or block spending.',
      simulationLabel: 'Read-only snapshot',
      simulationDetail: 'Live activity has not been connected for this account.',
    },
    plan: {
      name: 'Essentials-first budget',
      detail: 'Monthly context is grouped around essentials, flexible spend, and recent activity.',
    },
    monthState: {
      title: 'This month',
      badge: {
        label: 'Waiting for activity',
        tone: 'stable',
      },
      primaryMetric: {
        kind: 'essentials_buffer',
        label: 'Essentials buffer',
        value: 'No live snapshot',
        helper: 'Connect activity to see a current month view.',
      },
      bufferBar: {
        label: 'Buffer usage',
        usedPercent: 0,
        remainingLabel: 'No usage recorded',
      },
      explanation: 'No live account activity is available yet.',
      planDefinition: 'Cherry keeps Home read-only and separate from opt-in planning.',
      cta: {
        label: 'Plan a purchase',
        href: '/app/autopilot',
      },
    },
    headsUp: [],
    bucketPreview: [],
    upcoming: [],
    recent: [],
    emptyStates: {
      headsUp: 'No account notes yet.',
      bucketPreview: 'No buckets have live activity yet.',
      upcoming: 'No upcoming items are available.',
      recent: 'No recent advisory events are available.',
    },
  };
}
