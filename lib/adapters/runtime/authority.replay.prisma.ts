// authority_v1 — frozen. Any semantic change requires authority_v2.
import { prisma } from '../../prisma.js';
import type { DecisionEvent } from '@prisma/client';
import { simulateSpendAuthority } from './authority.prisma.js';
import type {
  SimulateSpendParams,
  SimulatedAuthorityDecision,
  CounterfactualAuthorityRequest,
} from '../../authority/simulateSpendAuthority.js';

type ReplayLookup =
  | { decisionEventId: string; userId?: string; inputsVersion?: string }
  | { decisionEventId?: string; userId: string; inputsVersion: string };

type ReplayResult = {
  event: DecisionEvent;
  recomputed: SimulatedAuthorityDecision;
  matches: boolean;
  diff: {
    verdictChanged: boolean;
    severityChanged: boolean;
    reasonsChanged: boolean;
    inputsVersionChanged: boolean;
  };
};

function assertParamsFromEvent(event: DecisionEvent): SimulateSpendParams {
  const rawCounterfactuals = Array.isArray(event.counterfactuals)
    ? (event.counterfactuals as unknown[])
    : [];
  const counterfactuals: CounterfactualAuthorityRequest[] = rawCounterfactuals.filter(
    (entry): entry is CounterfactualAuthorityRequest => entry !== null && typeof entry === 'object'
  );
  return {
    userId: event.userId,
    amountCents: event.amountCents,
    category: event.category as SimulateSpendParams['category'],
    surface: event.surface as SimulateSpendParams['surface'],
    counterfactuals,
  };
}

function requireFound(found: DecisionEvent | null): DecisionEvent {
  if (found === null) throw new Error('DecisionEvent not found');
  return found;
}

function decisionEventIdOf(lookup: ReplayLookup): string | undefined {
  const id = 'decisionEventId' in lookup ? lookup.decisionEventId : undefined;
  return id !== '' ? id : undefined;
}

async function loadLatestForUser(lookup: ReplayLookup): Promise<DecisionEvent> {
  const { userId, inputsVersion } = lookup;
  if (userId === undefined || inputsVersion === undefined) {
    throw new Error('userId and inputsVersion are required for lookup');
  }
  const found = await prisma.decisionEvent.findFirst({
    where: { userId, inputsVersion },
    orderBy: { createdAt: 'desc' },
  });
  return requireFound(found);
}

async function loadDecisionEvent(lookup: ReplayLookup): Promise<DecisionEvent> {
  const decisionEventId = decisionEventIdOf(lookup);
  if (decisionEventId !== undefined) {
    const found = await prisma.decisionEvent.findUnique({
      where: { id: decisionEventId },
    });
    return requireFound(found);
  }
  return loadLatestForUser(lookup);
}

export async function replayAuthority(lookup: ReplayLookup): Promise<ReplayResult> {
  const event = await loadDecisionEvent(lookup);
  const params = assertParamsFromEvent(event);
  const authorityResult = await simulateSpendAuthority(params, { nowMs: event.createdAt.getTime() });
  const recomputed = authorityResult.decision;

  const reasonsChanged =
    recomputed.reasons.map((r) => r.code).join('|') !==
    (Array.isArray(event.reasonCodes) ? event.reasonCodes.join('|') : String(event.reasonCode));
  const matches =
    recomputed.verdict === event.verdict &&
    recomputed.severity === event.severity &&
    !reasonsChanged &&
    recomputed.inputsVersion === event.inputsVersion;

  return {
    event,
    recomputed,
    matches,
    diff: {
      verdictChanged: recomputed.verdict !== event.verdict,
      severityChanged: recomputed.severity !== event.severity,
      reasonsChanged,
      inputsVersionChanged: recomputed.inputsVersion !== event.inputsVersion,
    },
  };
}

export type { ReplayLookup, ReplayResult };
