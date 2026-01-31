import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { EngineInput } from '../../engine/input/EngineInput.js';
import {
  buildTraceId,
  formatDateKeys,
  normalizeReplayInput,
  serializeJson,
  type ReplayMeta,
  type VersionSnapshot,
} from '../../replay/record.js';

type ReplayArgs = {
  enabled: boolean;
  input: EngineInput;
  versions: VersionSnapshot;
  output: unknown;
  meta: ReplayMeta;
};

function hashInput(serializedInput: string): string {
  return crypto.createHash('sha256').update(serializedInput).digest('hex');
}

export async function maybeRecordReplayTrace(args: ReplayArgs): Promise<void> {
  if (!args.enabled) return;
  try {
    const serializedInput = normalizeReplayInput(args.input);
    const hash = hashInput(serializedInput).slice(0, 12);
    const timestampMs = args.meta.timestampMs ?? 0;
    const { monthKey, dayKey } = formatDateKeys(timestampMs);
    const traceId = buildTraceId(args.meta.source, dayKey, hash);

    const root = path.join(process.cwd(), 'tests', 'replay', '_staging', monthKey, traceId);
    fs.mkdirSync(root, { recursive: true });

    const meta = { ...args.meta, traceId };

    fs.writeFileSync(path.join(root, 'input.json'), serializedInput);
    fs.writeFileSync(path.join(root, 'versions.json'), serializeJson(args.versions));
    fs.writeFileSync(path.join(root, 'output.json'), serializeJson(args.output));
    fs.writeFileSync(path.join(root, 'meta.json'), serializeJson(meta));
  } catch (error: unknown) {
    console.warn('[engine] replay recording failed', error);
  }
}
