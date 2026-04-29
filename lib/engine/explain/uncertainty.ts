import {
  collectUncertaintyAssumptions,
  type UncertaintyAssumption,
} from '../uncertainty/policy.js';
import type {
  NumericDistribution,
  UncertaintyLevel,
  UncertaintySeed,
} from '../uncertainty/types.js';

export type ExpectedValueAssumptionExplanation = {
  label: string;
  path: string;
  distribution: string;
};

export type ExpectedValueUncertaintyExplanation = {
  type: 'expected_value';
  assumptions: readonly ExpectedValueAssumptionExplanation[];
  seed: UncertaintySeed;
  samples: number;
  expectedOutcome: unknown;
  expectedUtility: number;
  variance?: number;
  riskLambda: number;
  riskAdjustedExpectedUtility?: number;
  uncertaintyLevel: UncertaintyLevel;
  confidenceNote: 'results are expectations, not guarantees';
};

export function formatNumericDistribution(d: NumericDistribution): string {
  switch (d.kind) {
    case 'point':
      return `point(value=${d.value})`;
    case 'normal':
      return `normal(mu=${d.mean}, sigma=${d.std})`;
    case 'lognormal':
      return `lognormal(mu=${d.mu}, sigma=${d.sigma})`;
    case 'discrete':
      return `discrete(values=[${d.values.join(',')}], probs=[${d.probs.join(',')}])`;
    default: {
      const exhaustive: never = d;
      throw new Error(`Unsupported distribution: ${JSON.stringify(exhaustive)}`);
    }
  }
}

export function classifyRelativeUncertainty(params: {
  expectedUtility: number;
  variance?: number;
}): UncertaintyLevel {
  if (
    params.variance === undefined ||
    params.variance < 0 ||
    !Number.isFinite(params.variance) ||
    !Number.isFinite(params.expectedUtility) ||
    params.expectedUtility === 0
  ) {
    return 'unknown';
  }

  const cv = Math.sqrt(params.variance) / Math.abs(params.expectedUtility);
  if (cv < 0.1) return 'low';
  if (cv <= 0.3) return 'medium';
  return 'high';
}

function explainAssumption(
  assumption: UncertaintyAssumption
): ExpectedValueAssumptionExplanation {
  return {
    label: assumption.label,
    path: assumption.path,
    distribution: formatNumericDistribution(assumption.distribution),
  };
}

export function buildExpectedValueUncertaintyExplanation(params: {
  state: unknown;
  seed: UncertaintySeed;
  samples: number;
  expectedOutcome: unknown;
  expectedUtility: number;
  variance?: number;
  riskLambda?: number;
  riskAdjustedExpectedUtility?: number;
}): ExpectedValueUncertaintyExplanation {
  const riskLambda = params.riskLambda === undefined ? 0 : params.riskLambda;
  const explanation: ExpectedValueUncertaintyExplanation = {
    type: 'expected_value',
    assumptions: collectUncertaintyAssumptions(params.state).map(explainAssumption),
    seed: params.seed,
    samples: params.samples,
    expectedOutcome: params.expectedOutcome,
    expectedUtility: params.expectedUtility,
    riskLambda,
    uncertaintyLevel: classifyRelativeUncertainty(
      params.variance === undefined
        ? { expectedUtility: params.expectedUtility }
        : { expectedUtility: params.expectedUtility, variance: params.variance }
    ),
    confidenceNote: 'results are expectations, not guarantees',
  };

  if (params.variance !== undefined) {
    explanation.variance = params.variance;
  }
  if (params.riskAdjustedExpectedUtility !== undefined) {
    explanation.riskAdjustedExpectedUtility = params.riskAdjustedExpectedUtility;
  }

  return explanation;
}
