import assert from 'node:assert/strict';
import Module from 'node:module';
import { RewardCategory } from '@prisma/client';
import type {
  SimulatedAuthorityDecision,
  SimulateSpendParams,
} from '../lib/authority/simulateSpendAuthority';
import { AuthorityReason } from '../lib/authority/reasonCodes';

const requireModule = Module.createRequire(__filename);

function resetModule(modulePath: string): void {
  try {
    const resolved = requireModule.resolve(modulePath);
    delete requireModule.cache[resolved];
  } catch {
    // ignore
  }
}

function installStubs({ withCreate }: { withCreate: boolean }) {
  const prismaPath = requireModule.resolve('@/lib/prisma');
  const logPath = requireModule.resolve('@/lib/log');

  resetModule(prismaPath);
  resetModule(logPath);
  resetModule('../lib/authority/simulateSpendAuthority');

  const calls: Array<{ args: unknown }> = [];
  const logCalls: Array<Record<string, unknown>> = [];

  requireModule.cache[prismaPath] = {
    id: prismaPath,
    filename: prismaPath,
    loaded: true,
    exports: {
      prisma: {
        decisionEvent: withCreate
          ? {
              create: async (args: unknown) => {
                calls.push({ args });
              },
            }
          : undefined,
      },
    },
  } as NodeModule;

  requireModule.cache[logPath] = {
    id: logPath,
    filename: logPath,
    loaded: true,
    exports: {
      logInvariantViolation: (data: Record<string, unknown>) => {
        logCalls.push(data);
      },
    },
  } as NodeModule;

  return { calls, logCalls };
}

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
  const { calls } = installStubs({ withCreate: true });
  const mod = requireModule(
    '../lib/authority/simulateSpendAuthority'
  ) as unknown as typeof import('../lib/authority/simulateSpendAuthority');
  const { recordDecisionEvent } = mod;

  await recordDecisionEvent({
    userId: 'user-1',
    surface: 'simulate',
    params: buildParams(),
    decision: buildDecision(),
  });

  assert.equal(calls.length, 1, 'decisionEvent.create should be called once');
  const data = (calls[0]?.args as { data?: unknown })?.data as Record<string, unknown>;
  assert.equal(data?.['userId'], 'user-1');
  assert.equal(data?.['surface'], 'simulate');
  assert.equal(data?.['amountCents'], 1234);
}

async function assertSkipsWhenClientMissing() {
  const { calls, logCalls } = installStubs({ withCreate: false });
  const mod = requireModule(
    '../lib/authority/simulateSpendAuthority'
  ) as unknown as typeof import('../lib/authority/simulateSpendAuthority');
  const { recordDecisionEvent } = mod;

  await recordDecisionEvent({
    userId: 'user-2',
    surface: 'simulate',
    params: buildParams(),
    decision: buildDecision(),
    db: {} as never,
  });

  assert.equal(calls.length, 0, 'should not attempt to call create without client');
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
