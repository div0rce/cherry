export type AutopilotUiSpec = {
  eyebrow: string;
  headline: string;
  subhead: string;
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
    eyebrow: 'Cherry Autopilot',
    headline: 'See how Autopilot would handle this purchase.',
    subhead:
      'Describe the spend, Autopilot simulates your month, chooses the card, and shows bucket impact before you tap pay.',
    simulationErrorMessage:
      'Autopilot could not simulate this purchase right now. Your buckets and cards are untouched; try again shortly.',
    panel: {
      idleTitle: 'Autopilot is idle',
      idleBody: 'Fill in an amount and merchant on the left. Autopilot will show the best card and the full impact on your month.',
      loadingTitle: 'Preparing simulation',
      loadingBody: 'Autopilot is analyzing this purchase...',
      loadingShimmerLines: 4,
      errorTitle: 'Simulation issue',
      errorBody: 'Simulation output is unavailable right now. Please try again in a moment.',
      errorTimestampFallback: 'Just now',
      sectionSimulationEyebrow: 'This simulation',
      unnamedMerchantFallback: 'Unnamed merchant',
      recommendationSectionTitle: 'Recommendation',
      alternativeSectionTitle: 'Alternatives',
      actionComingSoonNote: 'Actions coming soon — this is a planning sandbox.',
      simulationIssueTitle: 'Simulation issue',
      showingPreviousResultNote: 'Showing your last successful simulation.',
      safetyLabel: 'Safety indicator',
    },
    form: {
      formTitle: 'Upcoming purchase',
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
          helper: 'Schedule-aware flows will use this later.',
        },
      ],
      submitLoadingLabel: 'Running Autopilot...',
      submitLabel: 'Simulate with Autopilot',
      helperText: 'We never charge your cards from here. This is a live sandbox to plan the swipe before it happens.',
      disclaimer:
        'Autopilot uses amount, merchant, and category to simulate your month before you commit in your banking app.',
    },
  };
}
