export const PR_RISK_CLASSIFIER_VERSION = 'pr-risk@1' as const;
export const FORBIDDEN_CHANGE_CLASSIFIER_VERSION = 'forbidden-change@1' as const;
export const DOCS_DRIFT_CLASSIFIER_VERSION = 'docs-drift@1' as const;
export const SIMULATION_DRIFT_CLASSIFIER_VERSION = 'simulation-drift@1' as const;
export const PR_AUTOMATION_CLASSIFIER_VERSION =
  'pr-automation@1(pr-risk@1,forbidden-change@1,docs-drift@1)' as const;

export type AutomationFileChange = {
  filename: string;
  status?: string | undefined;
  additions?: number | undefined;
  deletions?: number | undefined;
  changes?: number | undefined;
  patch?: string | undefined;
};

export type AutomationStatusRequest = {
  context:
    | 'cherry/forbidden-change'
    | 'cherry/docs-drift'
    | 'cherry/risk-gate'
    | 'cherry/openclaw-policy';
  state: 'error' | 'failure' | 'pending' | 'success';
  description: string;
  targetUrl?: string;
};

export type PrClassifierInput = {
  repo: string;
  sha: string;
  prNumber: number;
  title: string;
  body: string;
  labels: string[];
  files: AutomationFileChange[];
};
