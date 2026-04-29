export const DEFAULT_RISK_LAMBDA = 0;

export function riskAdjustedUtility(
  ev: number,
  variance: number,
  lambda: number = DEFAULT_RISK_LAMBDA
): number {
  if (!Number.isFinite(ev)) {
    throw new Error('Expected utility must be finite');
  }
  if (!Number.isFinite(variance) || variance < 0) {
    throw new Error('Variance must be finite and nonnegative');
  }
  if (!Number.isFinite(lambda) || lambda < 0) {
    throw new Error('Risk lambda must be finite and nonnegative');
  }
  return ev - lambda * variance;
}
