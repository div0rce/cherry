import type { UncertaintySeed } from './types.js';

function hashSeed(seed: UncertaintySeed): number {
  const text = String(seed);
  let hash = 2166136261;

  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);
    hash ^= code;
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

export function createSeededRng(seed: UncertaintySeed): () => number {
  let state = hashSeed(seed);

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}
