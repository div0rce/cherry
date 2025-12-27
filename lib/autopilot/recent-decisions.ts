import { z } from 'zod';
import type { AutopilotDecisionStatus } from './types';

export type StoredAutopilotDecision = {
  decisionId: string;
  merchant: string;
  amountCents: number;
  cardLabel: string;
  occurredAt: string;
  status: AutopilotDecisionStatus;
};

const STORAGE_PREFIX = 'cherry_autopilot_recent';
const DEFAULT_MAX = 8;

function getStorageKey(userId: string | null | undefined): string {
  return `${STORAGE_PREFIX}:${userId ?? 'anon'}`;
}

const StoredDecisionSchema = z
  .object({
    decisionId: z.string().min(1),
    merchant: z.string().min(1),
    amountCents: z.number().finite(),
    cardLabel: z.string().min(1),
    occurredAt: z.string().min(1),
    status: z.enum(['ok', 'blocked', 'fallback']),
  })
  .strict();

const StoredDecisionListSchema = z.array(StoredDecisionSchema);

export async function loadRecentAutopilotDecisions(
  userId: string | null | undefined
): Promise<StoredAutopilotDecision[]> {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(getStorageKey(userId));
    if (raw === null) return [];
    const parsedJson = (await new Response(raw).json()) as unknown;
    const parsed = StoredDecisionListSchema.safeParse(parsedJson);
    if (!parsed.success) return [];
    return parsed.data;
  } catch (error: unknown) {
    void error;
    return [];
  }
}

function persistRecentDecisions(
  userId: string | null | undefined,
  decisions: StoredAutopilotDecision[]
): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(getStorageKey(userId), JSON.stringify(decisions));
  } catch (error: unknown) {
    void error;
    // Ignore storage failures silently; recent decisions are best-effort.
  }
}

export async function appendRecentAutopilotDecision(
  userId: string | null | undefined,
  decision: StoredAutopilotDecision,
  maxEntries = DEFAULT_MAX
): Promise<StoredAutopilotDecision[]> {
  const current = await loadRecentAutopilotDecisions(userId);
  const deduped = current.filter((entry) => entry.decisionId !== decision.decisionId);
  const next = [decision, ...deduped].slice(0, maxEntries);
  persistRecentDecisions(userId, next);
  return next;
}
