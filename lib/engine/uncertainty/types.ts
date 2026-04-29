export type NumericDistributionKind =
  | 'point'
  | 'normal'
  | 'lognormal'
  | 'discrete';

export type NumericDistribution =
  | { kind: 'point'; value: number }
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

export function hasUncertaintyShapeIntent(value: unknown): value is Record<string, unknown> {
  return isRecord(value) && 'distribution' in value;
}

export function isNumericDistribution(value: unknown): value is NumericDistribution {
  if (!isRecord(value)) return false;
  if (typeof value['kind'] !== 'string') return false;

  switch (value['kind']) {
    case 'point':
      return typeof value['value'] === 'number';
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
  if (!hasUncertaintyShapeIntent(value)) return false;
  const keys = Object.keys(value).sort((a, b) => {
    if (a < b) return -1;
    if (a > b) return 1;
    return 0;
  });
  if (keys.length !== 2) return false;
  if (keys[0] !== 'distribution') return false;
  if (keys[1] !== 'label') return false;
  return (
    typeof value['label'] === 'string' &&
    isNumericDistribution(value['distribution'])
  );
}
