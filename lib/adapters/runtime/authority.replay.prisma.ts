// authority_v1 — frozen. Any semantic change requires authority_v2.
import { prisma } from '../../prisma';
import type { DecisionEvent } from '@prisma/client';
import { simulateSpendAuthority } from './authority.prisma';
import type {
  SimulateSpendParams,
  SimulatedAuthorityDecision,
  CounterfactualAuthorityRequest,
} from '../../authority/simulateSpendAuthority';

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

async function loadDecisionEvent(lookup: ReplayLookup): Promise<DecisionEvent> {
  if ('decisionEventId' in lookup && lookup.decisionEventId !== undefined && lookup.decisionEventId !== '') {
    const found = await prisma.decisionEvent.findUnique({
      where: { id: lookup.decisionEventId },
    });
    if (found === null) throw new Error('DecisionEvent not found');
    return found;
  }

  if (lookup.userId === undefined || lookup.inputsVersion === undefined) {
    throw new Error('userId and inputsVersion are required for lookup');
  }
  const found = await prisma.decisionEvent.findFirst({
    where: { userId: lookup.userId, inputsVersion: lookup.inputsVersion },
    orderBy: { createdAt: 'desc' },
  });
  if (found === null) throw new Error('DecisionEvent not found');
  return found;
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
