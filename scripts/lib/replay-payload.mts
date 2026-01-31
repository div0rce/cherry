import { createHash } from 'node:crypto';
import * as path from 'node:path';

export type ReplayPayload = {
  input: unknown;
  output: unknown;
  meta: unknown;
};

export type VersionSnapshot = {
  engineBehaviorVersion: string;
  engineInputVersion: string;
  engineCandidateSpaceVersion: string;
  engineAccountingVersion: string;
};

export function replayIndexFilename(versions: VersionSnapshot): string {
  return [
    'engine@',
    versions.engineBehaviorVersion,
    '__',
    versions.engineInputVersion,
    '__',
    versions.engineCandidateSpaceVersion,
    '__',
    versions.engineAccountingVersion,
    '.json',
  ].join('');
}

export function replayObjectRelativePath(hash: string): string {
  const prefix = hash.slice(0, 2);
  const bucket = hash.slice(2, 4);
  return path.join('objects', prefix, bucket, `${hash}.json`);
}

export function replayObjectPath(root: string, hash: string): string {
  return path.join(root, replayObjectRelativePath(hash));
}

export function normalizeJson(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => normalizeJson(entry));
  }
  if (value !== null && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record).sort();
    const normalized: Record<string, unknown> = {};
    for (const key of keys) {
      normalized[key] = normalizeJson(record[key]);
    }
    return normalized;
  }
  return value;
}

export function hashReplayPayload(payload: ReplayPayload): string {
  const normalized = normalizeJson(payload);
  const json = JSON.stringify(normalized);
  return createHash('sha256').update(json).digest('hex');
}
