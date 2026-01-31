import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { EngineInput } from '../input/EngineInput.js';

export type ReplayMeta = {
  traceId: string;
  source: 'api/scan' | 'api/simulate' | 'autopilot';
  surface: string;
  timestampMs?: number;
  user: string;
};

export type VersionSnapshot = {
  engineBehaviorVersion: string;
  engineInputVersion: string;
  engineCandidateSpaceVersion: string;
  engineAccountingVersion: string;
};

type ReplayArgs = {
  input: EngineInput;
  versions: VersionSnapshot;
  output: unknown;
  meta: ReplayMeta;
};

const RECORD_ENV = 'CHERRY_ENGINE_REPLAY_RECORD';

function normalizeJson(value: unknown): unknown {
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

function serializeJson(value: unknown): string {
  const normalized = normalizeJson(value);
  return `${JSON.stringify(normalized, null, 2)}\n`;
}

function pad2(value: number): string {
  return value < 10 ? `0${value}` : String(value);
}

function toUtcDateParts(timestampMs: number): { year: number; month: number; day: number } {
  const dayMs = 86_400_000;
  const days = Math.floor(timestampMs / dayMs);
  let z = days + 719468;
  const era = Math.floor(z / 146097);
  const doe = z - era * 146097;
  const yoe = Math.floor(
    (doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365
  );
  let year = yoe + era * 400;
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100));
  const mp = Math.floor((5 * doy + 2) / 153);
  const day = doy - Math.floor((153 * mp + 2) / 5) + 1;
  const month = mp < 10 ? mp + 3 : mp - 9;
  year += month <= 2 ? 1 : 0;
  return { year, month, day };
}

function formatDateKeys(timestampMs: number): { monthKey: string; dayKey: string } {
  const parts = toUtcDateParts(timestampMs);
  const monthKey = `${parts.year}-${pad2(parts.month)}`;
  const dayKey = `${parts.year}${pad2(parts.month)}${pad2(parts.day)}`;
  return { monthKey, dayKey };
}

function hashInput(serializedInput: string): string {
  return crypto.createHash('sha256').update(serializedInput).digest('hex');
}

export async function maybeRecordReplayTrace(args: ReplayArgs): Promise<void> {
  if (process.env[RECORD_ENV] !== '1') return;
  try {
    const serializedInput = serializeJson(args.input);
    const hash = hashInput(serializedInput).slice(0, 12);
    const timestampMs = args.meta.timestampMs ?? 0;
    const { monthKey, dayKey } = formatDateKeys(timestampMs);
    const traceId = `scan-${dayKey}-${hash}`;

    const root = path.join(process.cwd(), 'tests', 'replay', '_staging', monthKey, traceId);
    fs.mkdirSync(root, { recursive: true });

    const meta = { ...args.meta, traceId };

    fs.writeFileSync(path.join(root, 'input.json'), serializedInput);
    fs.writeFileSync(path.join(root, 'versions.json'), serializeJson(args.versions));
    fs.writeFileSync(path.join(root, 'output.json'), serializeJson(args.output));
    fs.writeFileSync(path.join(root, 'meta.json'), serializeJson(meta));
  } catch (error: unknown) {
    if (process.env[RECORD_ENV] === '1') {
      console.warn('[engine] replay recording failed', error);
    }
  }
}
