export type AutopilotUiSpec = {
  eyebrow: string;
  modeLabel: string;
  headline: string;
  subhead: string;
  resultTitle: string;
  simulationErrorMessage: string;
  panel: {
    idleTitle: string;
    idleBody: string;
    loadingTitle: string;
    loadingBody: string;
    loadingShimmerLines: number;
    errorTitle: string;
    errorBody: string;
    errorTimestampFallback: string;
    sectionSimulationEyebrow: string;
    unnamedMerchantFallback: string;
    recommendationSectionTitle: string;
    alternativeSectionTitle: string;
    actionComingSoonNote: string;
    simulationIssueTitle: string;
    showingPreviousResultNote: string;
    safetyLabel: string;
  };
  form: {
    formTitle: string;
    amountLabel: string;
    amountPlaceholder: string;
    merchantLabel: string;
    merchantPlaceholder: string;
    categoryLabel: string;
    categoryOptions: Array<{
      value: AutopilotCategoryOptionValue;
      label: string;
      rewardCategory: AutopilotRewardCategoryOption;
    }>;
    timingLabel: string;
    timingOptions: Array<{
      value: AutopilotTimingOption;
      label: string;
      helper?: string;
    }>;
    submitLoadingLabel: string;
    submitLabel: string;
    helperText: string;
    disclaimer: string;
  };
};

export type AutopilotRewardCategoryOption =
  | 'DINING'
  | 'GROCERIES'
  | 'TRAVEL'
  | 'GAS'
  | 'OTHER';

export type AutopilotCategoryOptionValue = 'dining' | 'groceries' | 'travel' | 'gas' | 'other';

export type AutopilotTimingOption = 'now' | 'scheduled-soon';

export function getAutopilotUiSpec(): AutopilotUiSpec {
  return {
    eyebrow: 'Autopilot · Decide',
    modeLabel: 'Decide mode (optional)',
    headline: 'What are you about to buy?',
    subhead:
      'Cherry simulates this purchase before you make it. Autopilot is optional and advisory-only; no money movement happens here.',
    resultTitle: 'Autopilot Result',
    simulationErrorMessage:
      'Autopilot could not simulate this purchase right now. Your buckets and cards are untouched; try again shortly.',
    panel: {
      idleTitle: 'Autopilot is idle',
      idleBody:
        'Declare amount and merchant to run Autopilot. No recommendations are shown until you press Run Autopilot.',
      loadingTitle: 'Simulating intent',
      loadingBody: 'Cherry is evaluating this purchase against your buckets and cards.',
      loadingShimmerLines: 4,
      errorTitle: 'Simulation unavailable',
      errorBody: 'Simulation output is unavailable right now. Please try again in a moment.',
      errorTimestampFallback: 'Now',
      sectionSimulationEyebrow: 'Simulation context',
      unnamedMerchantFallback: 'Unnamed merchant',
      recommendationSectionTitle: 'Primary recommendation',
      alternativeSectionTitle: 'Alternatives',
      actionComingSoonNote: 'Advisory-only. Actions will stay in your wallet or banking app.',
      simulationIssueTitle: 'Simulation issue',
      showingPreviousResultNote: 'Showing your last successful simulation.',
      safetyLabel: 'Safety badge',
    },
    form: {
      formTitle: 'Intent declaration',
      amountLabel: 'Amount',
      amountPlaceholder: '42.18',
      merchantLabel: 'Merchant',
      merchantPlaceholder: 'Din Tai Fung',
      categoryLabel: 'Category',
      categoryOptions: [
        { value: 'dining', label: 'Dining', rewardCategory: 'DINING' },
        { value: 'groceries', label: 'Groceries', rewardCategory: 'GROCERIES' },
        { value: 'travel', label: 'Travel', rewardCategory: 'TRAVEL' },
        { value: 'gas', label: 'Gas', rewardCategory: 'GAS' },
        { value: 'other', label: 'Other', rewardCategory: 'OTHER' },
      ],
      timingLabel: 'Time',
      timingOptions: [
        { value: 'now', label: 'Now' },
        {
          value: 'scheduled-soon',
          label: 'Scheduling soon',
          helper: 'Use later when timing-aware flows are live.',
        },
      ],
      submitLoadingLabel: 'Running Autopilot...',
      submitLabel: 'Run Autopilot',
      helperText:
        'Amount and merchant are required. Autopilot stays advisory; no money movement happens here.',
      disclaimer:
        'Cherry evaluates only; you will choose and pay in your banking app.',
    },
  };
}
