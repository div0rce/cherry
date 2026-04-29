export type NumericDistributionKind =
  | 'point'
  | 'bernoulli'
  | 'normal'
  | 'lognormal'
  | 'discrete';

export type NumericDistribution =
  | { kind: 'point'; value: number }
  | { kind: 'bernoulli'; p: number }
  | { kind: 'normal'; mean: number; std: number }
  | { kind: 'lognormal'; mu: number; sigma: number }
  | { kind: 'discrete'; values: number[]; probs: number[] };

export type UncertainNumber = {
  distribution: NumericDistribution;
  label: string;
};

export type UncertaintySeed = string | number;

export type UncertaintyLevel = 'low' | 'medium' | 'high' | 'unknown';

export type RiskMetricKind = 'variance' | 'semivariance' | 'cvar';

export type ImplementedRiskMetricKind = Extract<RiskMetricKind, 'variance'>;

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isNumericDistribution(value: unknown): value is NumericDistribution {
  if (!isRecord(value) || typeof value['kind'] !== 'string') return false;

  switch (value['kind']) {
    case 'point':
      return typeof value['value'] === 'number';
    case 'bernoulli':
      return typeof value['p'] === 'number';
    case 'normal':
      return typeof value['mean'] === 'number' && typeof value['std'] === 'number';
    case 'lognormal':
      return typeof value['mu'] === 'number' && typeof value['sigma'] === 'number';
    case 'discrete':
      return Array.isArray(value['values']) && Array.isArray(value['probs']);
    default:
      return false;
  }
}

export function isUncertainNumber(value: unknown): value is UncertainNumber {
  return (
    isRecord(value) &&
    typeof value['label'] === 'string' &&
    isNumericDistribution(value['distribution'])
  );
}
