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

function normalizeJson(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => normalizeJson(entry));
  }
  if (value !== null && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    const normalized: Record<string, unknown> = {};
    for (const key of keys) {
      normalized[key] = normalizeJson(record[key]);
    }
    return normalized;
  }
  return value;
}

export function serializeJson(value: unknown): string {
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

export function formatDateKeys(timestampMs: number): { monthKey: string; dayKey: string } {
  const parts = toUtcDateParts(timestampMs);
  const monthKey = `${parts.year}-${pad2(parts.month)}`;
  const dayKey = `${parts.year}${pad2(parts.month)}${pad2(parts.day)}`;
  return { monthKey, dayKey };
}

function toTracePrefix(source: ReplayMeta['source']): string {
  if (source === 'api/scan') return 'scan';
  if (source === 'api/simulate') return 'simulate';
  return 'autopilot';
}

export function buildTraceId(source: ReplayMeta['source'], dayKey: string, hash: string): string {
  return `${toTracePrefix(source)}-${dayKey}-${hash}`;
}

export function normalizeReplayInput(input: EngineInput): string {
  return serializeJson(input);
}
