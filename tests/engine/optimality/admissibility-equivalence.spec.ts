import * as assert from 'node:assert/strict';
import {
  buildEngineContext,
  enforceHardConstraints,
  evaluateConstraintsForDecision,
  formatConstraintTag,
  getHardConstraints,
  simulateAction,
  solveDecision,
} from '../../../lib/engine.js';
import type { EngineDecision, EngineState } from '../../../lib/engine/types.js';
import {
  candidateSpaceVersion,
  enumerateCandidatesBounded,
  type Bounds,
  type Candidate,
} from '../../../lib/engine/optimality/candidates.js';
import { isAdmissible } from '../../../lib/engine/optimality/admissible.js';
import { objectiveVersion } from '../../../lib/engine/optimality/objective.js';
import { traceVersion } from '../../../lib/engine/optimality/types.js';
import {
  candidateKey,
  normalizeCandidate,
  normalizeCandidateToAction,
} from '../../../lib/engine/optimality/normalize.js';

const BASE_NOW_MS = 1704067200000;
const NEXT_PAYCHECK_MS = 1704326400000;

function buildBaseState(): EngineState {
  return {
    userId: 'user-1',
    buckets: [
      {
        id: 'bucket-essential',
        name: 'Essentials',
        categoryKey: 'GROCERIES',
        limitCents: 8_000,
        postedSpendCents: 2_000,
        pendingSpendCents: 0,
        committedCents: 2_000,
        remainingCents: 6_000,
        period: 'MONTHLY',
        isEssential: true,
        strictMode: true,
      },
      {
        id: 'bucket-dining',
        name: 'Dining',
        categoryKey: 'DINING',
        limitCents: 5_000,
        postedSpendCents: 1_000,
        pendingSpendCents: 0,
        committedCents: 1_000,
        remainingCents: 4_000,
        period: 'MONTHLY',
        isEssential: false,
        strictMode: false,
      },
    ],
    debts: [
      {
        id: 'debt-1',
        name: 'Card Debt A',
        type: 'CREDIT_CARD',
        balanceCents: 20_000,
        creditLimitCents: 50_000,
        aprPercent: 18,
        minPaymentCents: 1_000,
        dueDayOfMonth: 1,
      },
      {
        id: 'debt-2',
        name: 'Card Debt B',
        type: 'CREDIT_CARD',
        balanceCents: 12_000,
        creditLimitCents: 30_000,
        aprPercent: 22,
        minPaymentCents: 800,
        dueDayOfMonth: 15,
      },
    ],
    constraints: {
      hard: {
        minEssentialCoverageDays: 0,
        maxCardUtilization: 0.9,
      },
      soft: {
        avoidInterest: false,
        avoidNewDebt: false,
      },
    },
    world: { baseInterestRate: null, inflationEstimate: null },
    cash: {
      liquidCents: 20_000,
      nextPaycheckDateMs: NEXT_PAYCHECK_MS,
      nextPaycheckNetCents: 50_000,
    },
    preferences: { profileId: 'BALANCED' },
    cards: [
      {
        id: 'card-1',
        userId: 'user-1',
        issuer: 'Issuer',
        label: 'Everyday',
        network: 'VISA',
        productSlug: null,
        rewardRules: [
          {
            id: 'rule-1',
            cardId: 'card-1',
            categoryKey: 'DINING',
            rateType: 'POINTS_PER_DOLLAR',
            rateValue: 2,
            confidence: 1,
            source: 'STATIC_CONFIG',
          },
        ],
        isCredit: true,
        isActive: true,
        isVirtual: false,
      },
      {
        id: 'card-2',
        userId: 'user-1',
        issuer: 'Issuer',
        label: 'Backup',
        network: 'VISA',
        productSlug: null,
        rewardRules: [
          {
            id: 'rule-2',
            cardId: 'card-2',
            categoryKey: 'DINING',
            rateType: 'POINTS_PER_DOLLAR',
            rateValue: 1,
            confidence: 1,
            source: 'STATIC_CONFIG',
          },
        ],
        isCredit: true,
        isActive: true,
        isVirtual: false,
      },
    ],
  };
}

function buildContext() {
  return buildEngineContext({
    surface: 'web',
    nowMs: BASE_NOW_MS,
    merchantCategoryKey: 'DINING',
    amountCents: 10_000,
  });
}

function buildAlternateContext() {
  return buildEngineContext({
    surface: 'web',
    nowMs: BASE_NOW_MS + 86_400_000,
    merchantCategoryKey: 'GROCERIES',
    amountCents: 1_234,
  });
}

function buildBounds(): Bounds {
  return {
    useCard: {
      cardIds: ['card-1', 'card-2'],
    },
    useCardWithPaydown: {
      cardIds: ['card-1', 'card-2'],
      debtIds: ['debt-2', 'debt-1'],
      paydownAmountCents: [5_000],
      paydownScheduledDateMs: [NEXT_PAYCHECK_MS],
    },
    payDownDebt: {
      debtIds: ['debt-2', 'debt-1'],
      paydownAmountCents: [5_000],
      paydownScheduledDateMs: [NEXT_PAYCHECK_MS],
    },
    delayPurchase: {
      delayDays: [3, 7],
    },
    switchMerchant: {
      altMerchantNames: ['cheaper alternative'],
      altMerchantCategoryKeys: ['DINING'],
    },
    rejectPurchase: {
      enabled: true,
    },
  };
}

type StateCase = {
  name: string;
  state: EngineState;
};

function buildStateCases(): StateCase[] {
  const base = buildBaseState();

  const blockedCash = buildBaseState();
  blockedCash.cash = {
    liquidCents: -100,
    nextPaycheckDateMs: NEXT_PAYCHECK_MS,
    nextPaycheckNetCents: 50_000,
  };

  const lowLiquid = buildBaseState();
  lowLiquid.cash = {
    liquidCents: 1_000,
    nextPaycheckDateMs: NEXT_PAYCHECK_MS,
    nextPaycheckNetCents: 50_000,
  };

  const noDebts = buildBaseState();
  noDebts.debts = [];

  const allStrict = buildBaseState();
  allStrict.buckets = allStrict.buckets.map((bucket) => ({
    ...bucket,
    strictMode: true,
  }));

  const reversedBuckets = buildBaseState();
  reversedBuckets.buckets = [...reversedBuckets.buckets].reverse();

  return [
    { name: 'base', state: base },
    { name: 'blocked-cash', state: blockedCash },
    { name: 'low-liquid', state: lowLiquid },
    { name: 'no-debts', state: noDebts },
    { name: 'all-strict', state: allStrict },
    { name: 'reversed-buckets', state: reversedBuckets },
  ];
}

function engineEvaluate(
  candidate: Candidate,
  state: EngineState,
  ctx: ReturnType<typeof buildEngineContext>
): boolean {
  const normalized = normalizeCandidate(candidate);
  const action = normalizeCandidateToAction(normalized);
  const projections = simulateAction(state, ctx, action);
  const constraintTags = evaluateConstraintsForDecision(state, ctx, action, projections);
  const hardConstraints = getHardConstraints(state);

  for (const constraint of hardConstraints) {
    constraintTags.push(formatConstraintTag(constraint.severity, constraint.id));
  }

  const decision: EngineDecision = {
    actionId: candidateKey(normalized),
    action,
    score: 0,
    reasons: [],
    projections,
    constraintsBreached: constraintTags,
  };

  return enforceHardConstraints([decision]).length > 0;
}

function recomputeConstraintTags(
  decision: EngineDecision,
  state: EngineState,
  ctx: ReturnType<typeof buildEngineContext>
): string[] {
  const constraintTags = evaluateConstraintsForDecision(
    state,
    ctx,
    decision.action,
    decision.projections
  );
  const hardConstraints = getHardConstraints(state);

  for (const constraint of hardConstraints) {
    constraintTags.push(formatConstraintTag(constraint.severity, constraint.id));
  }

  return constraintTags;
}

async function run(): Promise<void> {
  assert.equal(objectiveVersion, 'objective_v1');
  assert.equal(candidateSpaceVersion, 'candidates_v1');
  assert.equal(traceVersion, 'trace_v1');

  const bounds = buildBounds();
  const ctx = buildContext();
  const altCtx = buildAlternateContext();
  const stateCases = buildStateCases();
  const baseState = stateCases[0]?.state ?? buildBaseState();
  const altState = stateCases[1]?.state ?? buildBaseState();
  const baseCandidates = enumerateCandidatesBounded(baseState, ctx, bounds);
  const altCandidates = enumerateCandidatesBounded(altState, altCtx, bounds);
  assert.deepEqual(
    baseCandidates,
    altCandidates,
    'candidate enumeration must be independent of state/context'
  );

  const { decisions } = await solveDecision(baseState, ctx);
  for (const decision of decisions) {
    const recomputed = recomputeConstraintTags(decision, baseState, ctx);
    assert.deepEqual(
      decision.constraintsBreached,
      recomputed,
      `constraintsBreached ordering drift for ${decision.actionId}`
    );
  }

  for (const { name, state } of stateCases) {
    const candidates = enumerateCandidatesBounded(state, ctx, bounds);
    assert.ok(candidates.length > 0);
    const unique = new Set(candidates.map((candidate) => candidateKey(candidate)));
    assert.equal(unique.size, candidates.length, `${name} expected unique candidates`);

    for (const candidate of candidates) {
      const engineValid = engineEvaluate(candidate, state, ctx);
      const admissible = isAdmissible(candidate, state, ctx);
      assert.equal(
        engineValid,
        admissible,
        `admissibility mismatch for ${candidateKey(candidate)} (${name})`
      );
    }
  }

  console.warn('engine optimality admissibility equivalence: ok');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
