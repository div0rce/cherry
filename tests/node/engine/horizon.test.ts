import * as assert from 'node:assert/strict';
import {
  DEFAULT_HORIZON_STEPS,
  MAX_HORIZON_STEPS,
  normalizeHorizonConfig,
  runHorizonRollout,
} from '../../../lib/engine.js';

type TestState = {
  value: number;
};

type TestAction = {
  id: string;
  delta: number;
};

type TestObjective = {
  utility: number;
};

function runTestRollout(steps = 3) {
  return runHorizonRollout<TestState, TestAction, TestObjective>({
    initialState: { value: 0 },
    config: normalizeHorizonConfig({ steps }),
    evaluatePolicy: ({ state, step }) => {
      if (step === 0) {
        return {
          action: { id: 'present-action', delta: 1 },
          objective: { utility: state.value + 10 },
        };
      }

      return {
        action: { id: `future-action-${step}`, delta: 100 + step },
        objective: { utility: state.value + 10_000 + step },
      };
    },
    applyAction: ({ state, action }) => ({
      value: state.value + action.delta,
    }),
  });
}

function testConfigDefaults(): void {
  const config = normalizeHorizonConfig();

  assert.equal(config.mode, 'planning');
  assert.equal(config.steps, DEFAULT_HORIZON_STEPS);
  assert.equal(config.futureJustification, 'forbidden');
}

function testInvalidHorizonLength(): void {
  assert.throws(() => normalizeHorizonConfig({ steps: 0 }), {
    message: 'Invalid horizon length: 0',
  });
  assert.throws(() => normalizeHorizonConfig({ steps: 1.5 }), {
    message: 'Invalid horizon length: 1.5',
  });
  assert.throws(() => normalizeHorizonConfig({ steps: MAX_HORIZON_STEPS + 1 }), {
    message: `Invalid horizon length: ${MAX_HORIZON_STEPS + 1}`,
  });
}

function testRolloutLabelsAndRoles(): void {
  const rollout = runTestRollout(3);

  assert.equal(rollout.label, 'planning_projection');
  assert.equal(rollout.steps[0]?.label, 'planning_projection');
  assert.equal(rollout.steps[0]?.stepRole, 'selected_present_action');
  assert.equal(rollout.steps[1]?.label, 'planning_projection');
  assert.equal(rollout.steps[1]?.stepRole, 'projected_future_action');
  assert.equal(rollout.steps[2]?.stepRole, 'projected_future_action');
}

function testRolloutLengthAndFutureJustification(): void {
  const rollout = runTestRollout(4);

  assert.equal(rollout.horizonSteps, 4);
  assert.equal(rollout.steps.length, 4);
  assert.equal(rollout.futureJustification, 'forbidden');
}

function testSelectedPresentActionComesOnlyFromStepZero(): void {
  const rollout = runTestRollout(3);

  assert.deepEqual(rollout.selectedPresentAction, {
    id: 'present-action',
    delta: 1,
  });
  assert.equal(rollout.steps[0]?.action?.id, 'present-action');
  assert.equal(rollout.steps[1]?.action?.id, 'future-action-1');
  assert.equal(rollout.steps[2]?.action?.id, 'future-action-2');
  assert.notEqual(
    rollout.selectedPresentAction?.id,
    rollout.steps[1]?.action?.id
  );
}

function testProjectedFutureActionsOnlyAffectProjectedState(): void {
  const rollout = runTestRollout(3);

  assert.deepEqual(rollout.steps[0]?.stateBefore, { value: 0 });
  assert.deepEqual(rollout.steps[0]?.stateAfter, { value: 1 });
  assert.deepEqual(rollout.steps[1]?.stateBefore, { value: 1 });
  assert.deepEqual(rollout.steps[1]?.stateAfter, { value: 102 });
  assert.deepEqual(rollout.steps[2]?.stateBefore, { value: 102 });
  assert.deepEqual(rollout.steps[2]?.stateAfter, { value: 204 });
  assert.deepEqual(rollout.selectedPresentAction, rollout.steps[0]?.action);
}

testConfigDefaults();
testInvalidHorizonLength();
testRolloutLabelsAndRoles();
testRolloutLengthAndFutureJustification();
testSelectedPresentActionComesOnlyFromStepZero();
testProjectedFutureActionsOnlyAffectProjectedState();

process.stdout.write('engine horizon rollout: ok\n');
