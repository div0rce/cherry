import { createHash } from 'crypto';
import { canonicalJson } from './canonical.js';
import type { StableId } from './types';

export function deriveStableId(namespace: string, payload: unknown): StableId {
  const serialized = canonicalJson(payload);
  const hash = createHash('sha256').update(serialized).digest('hex');
  return `${namespace}_${hash.slice(0, 24)}` as StableId;
}

export function assertStableId(id: string): void {
  if (id === undefined || id === null || typeof id !== 'string' || id === '') {
    throw new Error('StableId assertion failed: missing id');
  }
  if (!/^[a-z0-9_-]+_[a-f0-9]{24}$/i.test(id)) {
    throw new Error('StableId assertion failed: invalid format');
  }
  if (/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(id)) {
    throw new Error('StableId assertion failed: UUIDs are forbidden');
  }
}
