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

function realizeValue(value: unknown, rng: () => number, segments: readonly string[]): unknown {
  if (isUncertainNumber(value)) {
    return sample(value.distribution, rng);
  }

  if (Array.isArray(value)) {
    return value.map((entry, index) => realizeValue(entry, rng, [...segments, String(index)]));
  }

  if (isRecord(value)) {
    if (hasUncertaintyShapeIntent(value)) {
      const location = segments.length === 0 ? '$' : segments.join('.');
      throw new Error(`Invalid uncertain number at ${location}`);
    }
    if (!isPlainObject(value)) {
      const location = segments.length === 0 ? '$' : segments.join('.');
      throw new Error(`Expected JSON-plain object at ${location}`);
    }

    const realized: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
      realized[key] = realizeValue(entry, rng, [...segments, key]);
    }
    return realized;
  }

  return value;
}

export function realizeState<T>(state: T, rng: () => number): T {
  return realizeValue(state, rng, []) as T;
}
