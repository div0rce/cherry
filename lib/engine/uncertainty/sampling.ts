import type { NumericDistribution } from './types.js';

const PROBABILITY_SUM_TOLERANCE = 1e-9;

type DistributionOf<K extends NumericDistribution['kind']> = Extract<NumericDistribution, { kind: K }>;
type DiscreteDistribution = DistributionOf<'discrete'>;
type DistributionHandlers<R> = { [K in NumericDistribution['kind']]: (d: DistributionOf<K>) => R };

function assertFiniteNumber(value: number, label: string): void {
  if (!Number.isFinite(value)) {
    throw new Error(`${label} must be finite`);
  }
}

function assertProbability(value: number, label: string): void {
  assertFiniteNumber(value, label);
  if (value < 0 || value > 1) {
    throw new Error(`${label} must be between 0 and 1`);
  }
}

function assertNonNegative(value: number, label: string): void {
  if (value < 0) throw new Error(`${label} must be nonnegative`);
}

function dispatch<R>(handlers: DistributionHandlers<R>, d: NumericDistribution): R {
  if (!Object.prototype.hasOwnProperty.call(handlers, d.kind)) {
    throw new Error(`Unsupported distribution: ${JSON.stringify(d)}`);
  }
  const handler = handlers[d.kind] as (distribution: NumericDistribution) => R;
  return handler(d);
}

function discreteEntry(d: DiscreteDistribution, index: number): { value: number; probability: number } {
  const value = d.values[index];
  const probability = d.probs[index];
  if (value === undefined || probability === undefined) {
    throw new Error('discrete entries must be defined');
  }
  return { value, probability };
}

function validateDiscreteDistribution(d: DiscreteDistribution): void {
  if (d.values.length === 0) throw new Error('discrete.values must not be empty');
  if (d.values.length !== d.probs.length) {
    throw new Error('discrete.values and discrete.probs must have the same length');
  }
  let total = 0;
  for (let index = 0; index < d.values.length; index += 1) {
    const { value, probability } = discreteEntry(d, index);
    assertFiniteNumber(value, `discrete.values[${index}]`);
    assertProbability(probability, `discrete.probs[${index}]`);
    total += probability;
  }
  if (Math.abs(total - 1) > PROBABILITY_SUM_TOLERANCE) {
    throw new Error('discrete.probs must sum to 1');
  }
}

const VALIDATORS: DistributionHandlers<void> = {
  point: (d) => {
    assertFiniteNumber(d.value, 'point.value');
  },
  normal: (d) => {
    assertFiniteNumber(d.mean, 'normal.mean');
    assertFiniteNumber(d.std, 'normal.std');
    assertNonNegative(d.std, 'normal.std');
  },
  lognormal: (d) => {
    assertFiniteNumber(d.mu, 'lognormal.mu');
    assertFiniteNumber(d.sigma, 'lognormal.sigma');
    assertNonNegative(d.sigma, 'lognormal.sigma');
  },
  discrete: validateDiscreteDistribution,
};

export function validateNumericDistribution(d: NumericDistribution): void {
  dispatch(VALIDATORS, d);
}

const EXPECTATIONS: DistributionHandlers<number> = {
  point: (d) => d.value,
  normal: (d) => d.mean,
  lognormal: (d) => Math.exp(d.mu + (d.sigma * d.sigma) / 2),
  discrete: (d) =>
    d.values.reduce((sum, value, index) => {
      const probability = d.probs[index];
      return probability === undefined ? sum : sum + value * probability;
    }, 0),
};

export function expectation(d: NumericDistribution): number {
  validateNumericDistribution(d);
  return dispatch(EXPECTATIONS, d);
}

function standardNormalSample(rng: () => number): number {
  const u1 = Math.max(Number.MIN_VALUE, rng());
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

function sampleDiscrete(d: DiscreteDistribution, rng: () => number): number {
  const draw = rng();
  let cumulative = 0;
  const lastIndex = d.values.length - 1;
  for (let index = 0; index < d.values.length; index += 1) {
    const { value, probability } = discreteEntry(d, index);
    cumulative += probability;
    if (draw <= cumulative || index === lastIndex) {
      return value;
    }
  }
  throw new Error('discrete sample failed');
}

function samplers(rng: () => number): DistributionHandlers<number> {
  return {
    point: (d) => d.value,
    normal: (d) => d.mean + d.std * standardNormalSample(rng),
    lognormal: (d) => Math.exp(d.mu + d.sigma * standardNormalSample(rng)),
    discrete: (d) => sampleDiscrete(d, rng),
  };
}

export function sample(d: NumericDistribution, rng: () => number): number {
  validateNumericDistribution(d);
  return dispatch(samplers(rng), d);
}
