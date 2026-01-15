import * as assert from 'node:assert/strict';
import prismaClient from '@prisma/client';
import type {
  DecisionEventWriter,
  SimulatedAuthorityDecision,
  SimulateSpendParams,
} from '../lib/authority/simulateSpendAuthority';
import { recordDecisionEventWithWriter } from '../lib/authority/simulateSpendAuthority';
import { AuthorityReason } from '../lib/authority/reasonCodes';

const { RewardCategory } = prismaClient as typeof import('@prisma/client');

function buildDecision(): SimulatedAuthorityDecision {
  return {
    version: 'authority_v1',
    verdict: 'ALLOW_SIMULATED',
    severity: 0,
    reasons: [{ code: AuthorityReason.DAILY_STATE_RISKY, severity: 0, detail: 'stub' }],
    explanation: 'stub',
    inputsVersion: 'hash',
    engineVersion: 'test',
    counterfactuals: [],
  };
}

function buildParams(): SimulateSpendParams {
  return {
    userId: 'user-1',
    amountCents: 1234,
    category: RewardCategory.DINING,
    surface: 'simulate' as const,
    counterfactuals: [],
  };
}

async function assertRecordsDecision() {
  const calls: Array<{ args: unknown }> = [];
  const writer: DecisionEventWriter = {
    create: async (args) => {
      calls.push({ args });
    },
  };

  await recordDecisionEventWithWriter({
    userId: 'user-1',
    surface: 'simulate',
    params: buildParams(),
    decision: buildDecision(),
    writer,
  });

  assert.equal(calls.length, 1, 'decisionEvent.create should be called once');
  const data = (calls[0]?.args as { data?: unknown })?.data as Record<string, unknown>;
  assert.equal(data?.['userId'], 'user-1');
  assert.equal(data?.['surface'], 'simulate');
  assert.equal(data?.['amountCents'], 1234);
}

async function assertSkipsWhenClientMissing() {
  const logCalls: Array<Record<string, unknown>> = [];

  await recordDecisionEventWithWriter({
    userId: 'user-2',
    surface: 'simulate',
    params: buildParams(),
    decision: buildDecision(),
    logger: {
      info: () => {},
      warn: (message, meta) => {
        logCalls.push({ message, meta });
      },
      error: () => {},
    },
  });

  assert.ok(logCalls.length > 0, 'should log invariant when client missing');
}

async function run(): Promise<void> {
  await assertRecordsDecision();
  await assertSkipsWhenClientMissing();
  process.stdout.write('decision-event-recording: ok\n');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
