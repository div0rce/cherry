import { sample } from './sampling.js';
import {
  hasUncertaintyShapeIntent,
  isRecord,
  isUncertainNumber,
} from './types.js';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!isRecord(value)) return false;
  const prototype: unknown = Object.getPrototypeOf(value);
  if (prototype === Object.prototype) return true;
  if (prototype === null) return true;
  return false;
}

function locationOf(segments: readonly string[]): string {
  return segments.length === 0 ? '$' : segments.join('.');
}

function realizeRecord(
  value: Record<string, unknown>,
  rng: () => number,
  segments: readonly string[]
): Record<string, unknown> {
  if (hasUncertaintyShapeIntent(value)) {
    throw new Error(`Invalid uncertain number at ${locationOf(segments)}`);
  }
  if (!isPlainObject(value)) {
    throw new Error(`Expected JSON-plain object at ${locationOf(segments)}`);
  }

  const realized: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    realized[key] = realizeValue(entry, rng, [...segments, key]);
  }
  return realized;
}

function realizeValue(value: unknown, rng: () => number, segments: readonly string[]): unknown {
  if (isUncertainNumber(value)) {
    return sample(value.distribution, rng);
  }

  if (Array.isArray(value)) {
    return value.map((entry, index) => realizeValue(entry, rng, [...segments, String(index)]));
  }

  if (isRecord(value)) {
    return realizeRecord(value, rng, segments);
  }

  return value;
}

export function realizeState<T>(state: T, rng: () => number): T {
  return realizeValue(state, rng, []) as T;
}
