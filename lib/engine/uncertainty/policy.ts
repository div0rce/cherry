import { validateNumericDistribution } from './sampling.js';
import {
  hasUncertaintyShapeIntent,
  isRecord,
  isUncertainNumber,
  type NumericDistribution,
  type UncertainNumber,
} from './types.js';

export const MIN_EXPECTED_VALUE_SAMPLES = 100;
export const DEFAULT_EXPECTED_VALUE_SAMPLES = 500;
export const MAX_EXPECTED_VALUE_SAMPLES = 5000;

const NONNEGATIVE_PATH_PATTERN =
  /(?:cents|amount|balance|limit|income|expense|spend|cash|liquid|paycheck|rate|utilization)$/i;

export type UncertaintyAssumption = {
  path: string;
  label: string;
  distribution: NumericDistribution;
};

export function normalizeExpectedValueSamples(samples: number): number {
  if (!Number.isInteger(samples)) {
    throw new Error(`Expected-value samples must be an integer: ${samples}`);
  }
  const belowMinimum = samples < MIN_EXPECTED_VALUE_SAMPLES;
  const aboveMaximum = samples > MAX_EXPECTED_VALUE_SAMPLES;
  if (belowMinimum) {
    throw new Error(
      `Expected-value samples must be between ${MIN_EXPECTED_VALUE_SAMPLES} and ${MAX_EXPECTED_VALUE_SAMPLES}: ${samples}`
    );
  }
  if (aboveMaximum) {
    throw new Error(
      `Expected-value samples must be between ${MIN_EXPECTED_VALUE_SAMPLES} and ${MAX_EXPECTED_VALUE_SAMPLES}: ${samples}`
    );
  }
  return samples;
}

function pathString(segments: readonly string[]): string {
  return segments.length === 0 ? '$' : segments.join('.');
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!isRecord(value)) return false;
  const prototype: unknown = Object.getPrototypeOf(value);
  if (prototype === Object.prototype) return true;
  if (prototype === null) return true;
  return false;
}

function isNonnegativeDomain(segments: readonly string[]): boolean {
  const last = segments[segments.length - 1];
  return last !== undefined && NONNEGATIVE_PATH_PATTERN.test(last);
}

function distributionCanProduceNegative(d: NumericDistribution): boolean {
  switch (d.kind) {
    case 'point':
      return d.value < 0;
    case 'lognormal':
      return false;
    case 'normal':
      if (d.std > 0) return true;
      return d.mean < 0;
    case 'discrete':
      return d.values.some((value) => value < 0);
    default: {
      const exhaustive: never = d;
      throw new Error(`Unsupported distribution: ${JSON.stringify(exhaustive)}`);
    }
  }
}

function validateUncertainNumber(value: UncertainNumber, segments: readonly string[]): void {
  if (value.label.trim().length === 0) {
    throw new Error(`Uncertain number at ${pathString(segments)} must have a label`);
  }

  validateNumericDistribution(value.distribution);

  if (isNonnegativeDomain(segments) && distributionCanProduceNegative(value.distribution)) {
    throw new Error(
      `Uncertain number at ${pathString(segments)} uses a distribution that can produce negative values for a nonnegative domain`
    );
  }
}

export function collectUncertaintyAssumptions(value: unknown): UncertaintyAssumption[] {
  const assumptions: UncertaintyAssumption[] = [];

  function visit(current: unknown, segments: string[]): void {
    if (isUncertainNumber(current)) {
      validateUncertainNumber(current, segments);
      assumptions.push({
        path: pathString(segments),
        label: current.label,
        distribution: current.distribution,
      });
      return;
    }

    if (Array.isArray(current)) {
      current.forEach((entry, index) => visit(entry, [...segments, String(index)]));
      return;
    }

    if (isRecord(current)) {
      if (hasUncertaintyShapeIntent(current)) {
        throw new Error(`Invalid uncertain number at ${pathString(segments)}`);
      }
      if (!isPlainObject(current)) {
        throw new Error(`Expected JSON-plain object at ${pathString(segments)}`);
      }
      for (const [key, entry] of Object.entries(current)) {
        visit(entry, [...segments, key]);
      }
    }
  }

  visit(value, []);
  return assumptions;
}

export function validateUncertaintyState(value: unknown): void {
  collectUncertaintyAssumptions(value);
}
