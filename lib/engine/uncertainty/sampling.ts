import type { NumericDistribution } from './types.js';

const PROBABILITY_SUM_TOLERANCE = 1e-9;

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

export function validateNumericDistribution(d: NumericDistribution): void {
  switch (d.kind) {
    case 'point':
      assertFiniteNumber(d.value, 'point.value');
      return;
    case 'normal':
      assertFiniteNumber(d.mean, 'normal.mean');
      assertFiniteNumber(d.std, 'normal.std');
      if (d.std < 0) throw new Error('normal.std must be nonnegative');
      return;
    case 'lognormal':
      assertFiniteNumber(d.mu, 'lognormal.mu');
      assertFiniteNumber(d.sigma, 'lognormal.sigma');
      if (d.sigma < 0) throw new Error('lognormal.sigma must be nonnegative');
      return;
    case 'discrete': {
      if (d.values.length === 0) throw new Error('discrete.values must not be empty');
      if (d.values.length !== d.probs.length) {
        throw new Error('discrete.values and discrete.probs must have the same length');
      }
      let total = 0;
      for (let index = 0; index < d.values.length; index += 1) {
        const value = d.values[index];
        const probability = d.probs[index];
        if (value === undefined || probability === undefined) {
          throw new Error('discrete entries must be defined');
        }
        assertFiniteNumber(value, `discrete.values[${index}]`);
        assertProbability(probability, `discrete.probs[${index}]`);
        total += probability;
      }
      if (Math.abs(total - 1) > PROBABILITY_SUM_TOLERANCE) {
        throw new Error('discrete.probs must sum to 1');
      }
      return;
    }
    default: {
      const exhaustive: never = d;
      throw new Error(`Unsupported distribution: ${JSON.stringify(exhaustive)}`);
    }
  }
}

export function expectation(d: NumericDistribution): number {
  validateNumericDistribution(d);

  switch (d.kind) {
    case 'point':
      return d.value;
    case 'normal':
      return d.mean;
    case 'lognormal':
      return Math.exp(d.mu + (d.sigma * d.sigma) / 2);
    case 'discrete':
      return d.values.reduce((sum, value, index) => {
        const probability = d.probs[index];
        return probability === undefined ? sum : sum + value * probability;
      }, 0);
    default: {
      const exhaustive: never = d;
      throw new Error(`Unsupported distribution: ${JSON.stringify(exhaustive)}`);
    }
  }
}

function standardNormalSample(rng: () => number): number {
  const u1 = Math.max(Number.MIN_VALUE, rng());
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

export function sample(d: NumericDistribution, rng: () => number): number {
  validateNumericDistribution(d);

  switch (d.kind) {
    case 'point':
      return d.value;
    case 'normal':
      return d.mean + d.std * standardNormalSample(rng);
    case 'lognormal':
      return Math.exp(d.mu + d.sigma * standardNormalSample(rng));
    case 'discrete': {
      const draw = rng();
      let cumulative = 0;
      for (let index = 0; index < d.values.length; index += 1) {
        const probability = d.probs[index];
        const value = d.values[index];
        if (probability === undefined || value === undefined) {
          throw new Error('discrete entries must be defined');
        }
        cumulative += probability;
        if (draw <= cumulative || index === d.values.length - 1) {
          return value;
        }
      }
      throw new Error('discrete sample failed');
    }
    default: {
      const exhaustive: never = d;
      throw new Error(`Unsupported distribution: ${JSON.stringify(exhaustive)}`);
    }
  }
}
