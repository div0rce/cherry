import * as assert from 'node:assert/strict';
import {
  available,
  buildEngineContext,
  createLoadedEngineCapabilities,
  solveDecision,
} from '../../../../lib/engine.js';
import type { EngineDecision, EngineState } from '../../../../lib/engine/types.js';
import {
  candidateSpaceVersion,
  enumerateCandidatesBounded,
  type Bounds,
  type Candidate,
} from '../../../../lib/engine/optimality/candidates.js';
import { isAdmissible } from '../../../../lib/engine/optimality/admissible.js';
import {
  compareObjective,
  objectiveVersion,
  scoreVector,
  type ObjectiveVector,
} from '../../../../lib/engine/optimality/objective.js';
import { traceVersion } from '../../../../lib/engine/optimality/types.js';
import {
  candidateKey,
  normalizeCandidate,
  normalizeEngineDecisionToCandidate,
} from '../../../../lib/engine/optimality/normalize.js';

const BASE_NOW_MS = 1704067200000;
const NEXT_PAYCHECK_MS = 1704326400000;

const CANDIDATE_KEY_PREFIX_BY_TYPE: Record<Candidate['type'], string> = {
  USE_CARD: 'use_card',
  USE_CARD_WITH_PAYDOWN: 'use_card_with_paydown',
  PAY_DOWN_DEBT: 'pay_down_debt',
  DELAY_PURCHASE: 'delay_purchase',
  SWITCH_MERCHANT: 'switch_merchant',
  REJECT_PURCHASE: 'reject_purchase',
};

type ScoredCandidate = {
  candidate: Candidate;
  key: string;
  vector: ObjectiveVector;
};

type TraceCandidate = {
  candidate: Candidate;
  key: string;
  vector: ObjectiveVector;
};

type OptimalityTrace = {
  traceVersion: typeof traceVersion;
  objectiveVersion: typeof objectiveVersion;
  candidateSpaceVersion: typeof candidateSpaceVersion;
  scenario: string;
  bounds: Bounds;
  engine: {
    candidate: Candidate | null;
    key: string | null;
    vector: ObjectiveVector | null;
  };
  oracle: {
    candidate: Candidate | null;
    key: string | null;
    vector: ObjectiveVector | null;
  };
  topK: TraceCandidate[];
  zeroAdmissible: boolean;
};

type Scenario = {
  name: string;
  state: EngineState;
  ctx: ReturnType<typeof buildEngineContext>;
  bounds: Bounds;
};

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
    debts: available([
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
    ]),
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
    cash: available({
      liquidCents: 20_000,
      nextPaycheckDateMs: NEXT_PAYCHECK_MS,
      nextPaycheckNetCents: 50_000,
    }),
    capabilities: createLoadedEngineCapabilities(),
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

function candidateSignature(candidate: Candidate): string {
  return candidateKey(candidate);
}

function buildActionIdEquivalent(candidate: Candidate): string {
  switch (candidate.type) {
    case 'USE_CARD':
      return `use_card:${candidate.cardId ?? 'unknown'}`;
    case 'USE_CARD_WITH_PAYDOWN':
      return `use_card_with_paydown:${candidate.cardId ?? 'unknown'}:${
        candidate.debtId ?? 'none'
      }`;
    case 'PAY_DOWN_DEBT':
      return `pay_down_debt:${candidate.debtId ?? 'unknown'}`;
    case 'SWITCH_MERCHANT':
      return `switch_merchant:${candidate.altMerchantCategoryKey ?? 'unknown'}`;
    case 'DELAY_PURCHASE':
      return `delay_purchase:${candidate.delayDays ?? 0}`;
    case 'REJECT_PURCHASE':
      return 'reject_purchase';
    default:
      return 'unknown';
  }
}

function scoreCandidates(
  candidates: readonly Candidate[],
  state: EngineState,
  ctx: ReturnType<typeof buildEngineContext>
): ScoredCandidate[] {
  return candidates.map((candidate) => {
    const normalized = normalizeCandidate(candidate);
    const vector = scoreVector(normalized, state, ctx);
    return {
      candidate: normalized,
      key: candidateKey(normalized),
      vector,
    };
  });
}

function pickOracle(scored: ScoredCandidate[]): ScoredCandidate | null {
  if (scored.length === 0) return null;
  const sorted = [...scored].sort((a, b) => compareObjective(a.vector, b.vector));
  return sorted[0] ?? null;
}

async function runScenario(scenario: Scenario): Promise<OptimalityTrace> {
  const candidates = enumerateCandidatesBounded(scenario.state, scenario.ctx, scenario.bounds);
  assert.ok(candidates.length > 0, `${scenario.name} should enumerate candidates`);
  const unique = new Set(candidates.map((candidate) => candidateSignature(candidate)));
  assert.equal(
    unique.size,
    candidates.length,
    `${scenario.name} expected unique candidates`
  );
  const keySet = new Set(candidates.map((candidate) => candidateKey(candidate)));
  assert.equal(
    keySet.size,
    candidates.length,
    `${scenario.name} expected unique candidate keys`
  );

  for (const candidate of candidates) {
    const normalized = normalizeCandidate(candidate);
    assert.deepEqual(normalizeCandidate(normalized), normalized);
    const v1 = scoreVector(normalized, scenario.state, scenario.ctx);
    const v2 = scoreVector(normalized, scenario.state, scenario.ctx);
    assert.deepEqual(
      v1,
      v2,
      `${scenario.name} expected deterministic score for ${candidateKey(normalized)}`
    );
    const key = candidateKey(normalized);
    const expectedPrefix = CANDIDATE_KEY_PREFIX_BY_TYPE[normalized.type];
    if (normalized.type === 'REJECT_PURCHASE') {
      assert.equal(
        key,
        expectedPrefix,
        `${scenario.name} expected canonical key for ${normalized.type}`
      );
    } else {
      assert.ok(
        key.startsWith(`${expectedPrefix}:`),
        `${scenario.name} unexpected candidate key prefix for ${normalized.type}`
      );
    }
  }

  const admissible = candidates.filter((candidate) =>
    isAdmissible(candidate, scenario.state, scenario.ctx)
  );
  const scored = scoreCandidates(admissible, scenario.state, scenario.ctx);
  const oracle = pickOracle(scored);
  const scoredAll = scoreCandidates(candidates, scenario.state, scenario.ctx);
  const bestOverall = pickOracle(scoredAll);

  const result = await solveDecision(scenario.state, scenario.ctx);
  const engineDecision: EngineDecision | undefined = result.decisions[0];
  const engineCandidate = engineDecision
    ? normalizeEngineDecisionToCandidate(engineDecision)
    : null;

  const topK = scored
    .slice()
    .sort((a, b) => compareObjective(a.vector, b.vector))
    .slice(0, 5)
    .map((entry) => ({
      candidate: entry.candidate,
      key: entry.key,
      vector: entry.vector,
    }));

  if (admissible.length === 0) {
    assert.equal(engineDecision, undefined, `${scenario.name} expected no engine decision`);
    assert.equal(result.decisions.length, 0, `${scenario.name} expected empty decisions`);
  } else {
    assert.ok(engineDecision, `${scenario.name} expected engine decision`);
  }

  if (engineDecision !== undefined) {
    assert.ok(
      engineCandidate !== null,
      `${scenario.name} engine decision could not be normalized`
    );
  }

  if (engineCandidate !== null) {
    const engineVector = scoreVector(engineCandidate, scenario.state, scenario.ctx);
    const engineKey = candidateKey(engineCandidate);
    const oracleKey = oracle?.key ?? null;
    const oracleVector = oracle?.vector ?? null;

    const enumeratedSet = new Set(candidates.map((candidate) => candidateSignature(candidate)));
    assert.equal(
      enumeratedSet.has(candidateSignature(engineCandidate)),
      true,
      `${scenario.name} engine candidate not in enumeration`
    );
    // Engine actionId is intentionally lossy; assert compatibility, not identity.
    assert.equal(
      engineDecision?.actionId ?? null,
      buildActionIdEquivalent(engineCandidate),
      `${scenario.name} engine actionId incompatible with candidate`
    );
    assert.equal(isAdmissible(engineCandidate, scenario.state, scenario.ctx), true);
    assert.equal(engineKey, oracleKey, `${scenario.name} engine optimality mismatch`);
    assert.deepEqual(engineVector, oracleVector);
  }

  if (bestOverall != null) {
    const bestOverallAdmissible = isAdmissible(
      bestOverall.candidate,
      scenario.state,
      scenario.ctx
    );
    if (!bestOverallAdmissible) {
      if (engineCandidate != null) {
        assert.notEqual(
          candidateKey(engineCandidate),
          bestOverall.key,
          `${scenario.name} inadmissible top candidate was selected`
        );
      } else {
        assert.equal(
          admissible.length,
          0,
          `${scenario.name} expected zero admissible candidates`
        );
      }
    }
  }

  const trace: OptimalityTrace = {
    traceVersion,
    objectiveVersion,
    candidateSpaceVersion,
    scenario: scenario.name,
    bounds: scenario.bounds,
    engine: {
      candidate: engineCandidate,
      key: engineCandidate ? candidateKey(engineCandidate) : null,
      vector:
        engineCandidate != null ? scoreVector(engineCandidate, scenario.state, scenario.ctx) : null,
    },
    oracle: {
      candidate: oracle?.candidate ?? null,
      key: oracle?.key ?? null,
      vector: oracle?.vector ?? null,
    },
    topK,
    zeroAdmissible: admissible.length === 0,
  };

  return trace;
}

async function run(): Promise<void> {
  assert.equal(objectiveVersion, 'objective_v1');
  assert.equal(candidateSpaceVersion, 'candidates_v1');
  assert.equal(traceVersion, 'trace_v1');

  const baseState = buildBaseState();
  const baseCtx = buildContext();
  const bounds = buildBounds();

  const scenarios: Scenario[] = [
    {
      name: 'balanced-default',
      state: baseState,
      ctx: baseCtx,
      bounds,
    },
    {
      name: 'zero-admissible',
      state: {
        ...baseState,
        cash: available({
          liquidCents: -100,
          nextPaycheckDateMs: NEXT_PAYCHECK_MS,
          nextPaycheckNetCents: 50_000,
        }),
      },
      ctx: baseCtx,
      bounds,
    },
  ];

  for (const scenario of scenarios) {
    const first = await runScenario(scenario);
    const second = await runScenario(scenario);
    assert.equal(JSON.stringify(first), JSON.stringify(second));
  }

  console.warn('engine optimality exhaustive: ok');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
