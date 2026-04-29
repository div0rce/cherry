import * as assert from 'node:assert/strict';
import {
  buildExpectedValueUncertaintyExplanation,
  classifyRelativeUncertainty,
  collectUncertaintyAssumptions,
  createSeededRng,
  expectation,
  normalizeHorizonConfig,
  realizeState,
  runExpectedValueHorizonRollout,
  runHorizonRollout,
  sample,
  type HorizonRollout,
  type UncertainNumber,
} from '../../../lib/engine.js';

type TestState = {
  value: number | UncertainNumber;
  incomeCents?: number | UncertainNumber;
};

type TestAction = {
  delta: number;
};

type TestObjective = {
  utility: number;
};

function assertRealizedNumber(value: number | UncertainNumber): number {
  if (typeof value !== 'number') {
    throw new Error('transition received an unrealized uncertain value');
  }
  return value;
}

function runDeterministicTestRollout(initialState: { value: number }) {
  return runHorizonRollout<{ value: number }, TestAction, TestObjective>({
    initialState,
    config: normalizeHorizonConfig({ steps: 2 }),
    evaluatePolicy: ({ state }) => ({
      action: { delta: 1 },
      objective: { utility: state.value },
    }),
    applyAction: ({ state, action }) => ({
      value: state.value + action.delta,
    }),
  });
}

function utilityOfRollout(
  rollout: HorizonRollout<TestState, TestAction, TestObjective>
): number {
  const last = rollout.steps[rollout.steps.length - 1];
  assert.ok(last !== undefined);
  return assertRealizedNumber(last.stateAfter.value);
}

function testExpectationCorrectness(): void {
  assert.equal(expectation({ kind: 'point', value: 7 }), 7);
  assert.equal(expectation({ kind: 'bernoulli', p: 0.25 }), 0.25);
  assert.equal(expectation({ kind: 'normal', mean: 10, std: 2 }), 10);
  assert.equal(expectation({ kind: 'lognormal', mu: 1, sigma: 0 }), Math.exp(1));
  assert.equal(
    expectation({ kind: 'discrete', values: [1, 5, 10], probs: [0.2, 0.3, 0.5] }),
    6.7
  );
  assert.throws(
    () => expectation({ kind: 'discrete', values: [1, 2], probs: [0.4, 0.4] }),
    { message: 'discrete.probs must sum to 1' }
  );
}

function testSeededRngReproducibility(): void {
  const first = createSeededRng('seed-1');
  const second = createSeededRng('seed-1');
  const third = createSeededRng('seed-2');

  const firstValues = [first(), first(), first()];
  const secondValues = [second(), second(), second()];
  const thirdValues = [third(), third(), third()];

  assert.deepEqual(firstValues, secondValues);
  assert.notDeepEqual(firstValues, thirdValues);
}

function testSamplingMeanConvergence(): void {
  const rng = createSeededRng('sampling-mean');
  const draws = Array.from({ length: 10_000 }, () =>
    sample({ kind: 'normal', mean: 10, std: 2 }, rng)
  );
  const mean = draws.reduce((sum, value) => sum + value, 0) / draws.length;

  assert.ok(Math.abs(mean - 10) < 0.1, `mean ${mean} should converge near 10`);
}

function testRealizationIsNonMutatingAndNumericOnly(): void {
  const uncertain: UncertainNumber = {
    label: 'monthly_income',
    distribution: { kind: 'point', value: 4000 },
  };
  const state = {
    value: uncertain,
    nested: [{ value: uncertain }],
  };
  const realized = realizeState(state, createSeededRng('realize'));

  assert.deepEqual(realized, {
    value: 4000,
    nested: [{ value: 4000 }],
  });
  assert.deepEqual(state.value, uncertain);

  assert.throws(
    () =>
      collectUncertaintyAssumptions({
        incomeCents: {
          label: 'bad_income',
          distribution: { kind: 'normal', mean: 1000, std: 10 },
        },
      }),
    /can produce negative values/
  );
  assert.throws(
    () =>
      collectUncertaintyAssumptions({
        value: {
          label: 'bad_object',
          distribution: { kind: 'point', value: { nested: true } },
        },
      }),
    { message: 'Invalid uncertain number at value' }
  );
}

function testExpectedValuePointMatchesDeterministic(): void {
  const deterministic = runDeterministicTestRollout({ value: 2 });
  const deterministicUtility = deterministic.steps[deterministic.steps.length - 1]?.stateAfter.value;
  assert.equal(deterministicUtility, 4);

  const result = runExpectedValueHorizonRollout<TestState, TestAction, TestObjective>({
    initialState: {
      value: {
        label: 'starting_value',
        distribution: { kind: 'point', value: 2 },
      },
    },
    config: normalizeHorizonConfig({ steps: 2 }),
    samples: 100,
    seed: 'ev-point',
    evaluatePolicy: ({ state }) => ({
      action: { delta: 1 },
      objective: { utility: assertRealizedNumber(state.value) },
    }),
    applyAction: ({ state, action }) => ({
      value: assertRealizedNumber(state.value) + action.delta,
    }),
    utilityOfRollout,
  });

  assert.equal(result.expectedUtility, deterministicUtility);
  assert.equal(result.variance, 0);
  assert.deepEqual(result.representativeRollout.steps, deterministic.steps);
}

function testExpectedValueRejectsInvalidSampleCounts(): void {
  assert.throws(
    () =>
      runExpectedValueHorizonRollout<TestState, TestAction, TestObjective>({
        initialState: { value: 1 },
        config: normalizeHorizonConfig({ steps: 1 }),
        samples: 99,
        seed: 'too-small',
        evaluatePolicy: ({ state }) => ({
          action: { delta: 1 },
          objective: { utility: assertRealizedNumber(state.value) },
        }),
        applyAction: ({ state, action }) => ({
          value: assertRealizedNumber(state.value) + action.delta,
        }),
        utilityOfRollout,
      }),
    /between 100 and 5000/
  );
}

function testExplanationLabelsExpectedValue(): void {
  const state = {
    incomeCents: {
      label: 'monthly_income',
      distribution: { kind: 'lognormal', mu: 8, sigma: 0.1 },
    },
  };
  const explanation = buildExpectedValueUncertaintyExplanation({
    state,
    seed: 'explain-seed',
    samples: 500,
    expectedOutcome: { projectedUtility: 100 },
    expectedUtility: 100,
    variance: 400,
    riskLambda: 0,
    riskAdjustedExpectedUtility: 100,
  });

  assert.equal(explanation.type, 'expected_value');
  assert.equal(explanation.seed, 'explain-seed');
  assert.equal(explanation.samples, 500);
  assert.equal(explanation.uncertaintyLevel, 'medium');
  assert.equal(explanation.confidenceNote, 'results are expectations, not guarantees');
  assert.deepEqual(explanation.assumptions, [
    {
      label: 'monthly_income',
      path: 'incomeCents',
      distribution: 'lognormal(mu=8, sigma=0.1)',
    },
  ]);
}

function testRelativeUncertaintyClassification(): void {
  assert.equal(classifyRelativeUncertainty({ expectedUtility: 100, variance: 25 }), 'low');
  assert.equal(classifyRelativeUncertainty({ expectedUtility: 100, variance: 400 }), 'medium');
  assert.equal(classifyRelativeUncertainty({ expectedUtility: 100, variance: 1600 }), 'high');
  assert.equal(classifyRelativeUncertainty({ expectedUtility: 0, variance: 1 }), 'unknown');
  assert.equal(classifyRelativeUncertainty({ expectedUtility: 100 }), 'unknown');
}

testExpectationCorrectness();
testSeededRngReproducibility();
testSamplingMeanConvergence();
testRealizationIsNonMutatingAndNumericOnly();
testExpectedValuePointMatchesDeterministic();
testExpectedValueRejectsInvalidSampleCounts();
testExplanationLabelsExpectedValue();
testRelativeUncertaintyClassification();

process.stdout.write('engine uncertainty modeling: ok\n');
