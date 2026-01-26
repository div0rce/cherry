import * as assert from 'node:assert/strict';
import type { HomeUiBundle } from '../lib/home/ui-bundle';
import { getHomeUiBundle } from '../lib/home/ui-bundle.js';

function collectStrings(value: unknown, acc: string[]): void {
  if (typeof value === 'string') {
    acc.push(value);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((entry) => collectStrings(entry, acc));
    return;
  }
  if (value !== null && typeof value === 'object') {
    Object.values(value).forEach((entry) => collectStrings(entry, acc));
  }
}

async function run(): Promise<void> {
  const bundle: HomeUiBundle = await getHomeUiBundle('test-user');

  assert.ok(bundle.monthState !== null && bundle.monthState !== undefined, 'monthState is required');
  assert.ok(bundle.mode.label.length > 0, 'Mode label must be present');
  assert.ok(bundle.mode.detail.length > 0, 'Mode detail must be present');
  assert.ok(bundle.mode.simulationLabel.length > 0, 'Simulation label must be present');
  assert.ok(bundle.mode.simulationDetail.length > 0, 'Simulation detail must be present');
  assert.ok(bundle.plan.name.length > 0, 'Plan name must be present');
  assert.ok(bundle.plan.detail.length > 0, 'Plan detail must be present');
  assert.ok(bundle.headsUp.length <= 3, 'headsUp limited to 3 items');
  assert.ok(bundle.bucketPreview.length <= 3, 'bucketPreview limited to 3 items');
  assert.ok(bundle.upcoming.length <= 3, 'upcoming limited to 3 items');
  assert.ok(bundle.recent.length <= 3, 'recent limited to 3 items');
  assert.ok(!('authority' in (bundle as Record<string, unknown>)), 'Home bundle must stay authority-free');
  assert.ok(
    ['pace', 'essentials_buffer', 'safe_to_spend'].includes(bundle.monthState.primaryMetric.kind),
    'Primary metric kind must match contract'
  );
  assert.ok(
    bundle.monthState.primaryMetric.label.length > 0 && bundle.monthState.primaryMetric.helper.length > 0,
    'Primary metric label and helper must be present'
  );
  assert.ok(
    ['stable', 'tight', 'risky'].includes(bundle.monthState.badge.tone),
    'Badge tone must match contract'
  );
  assert.ok(bundle.monthState.cta.label.length > 0, 'Month CTA must be present');
  assert.ok(bundle.monthState.explanation.length > 0, 'Month explanation must be present');
  assert.ok(
    typeof bundle.monthState.planDefinition === 'string' &&
      bundle.monthState.planDefinition.length > 0,
    'Plan definition must be present'
  );
  assert.ok(
    typeof bundle.monthState.bufferBar?.label === 'string' &&
      typeof bundle.monthState.bufferBar?.remainingLabel === 'string',
    'Buffer bar labels must be present'
  );
  assert.ok(
    bundle.monthState.bufferBar.usedPercent >= 0 &&
      bundle.monthState.bufferBar.usedPercent <= 100,
    'Buffer bar usedPercent must be bounded'
  );
  assert.ok(bundle.headsUp.every((item) => ['info', 'caution', 'risk'].includes(item.severity)), 'Heads up severity must match contract');
  assert.ok(
    bundle.bucketPreview.every((bucket) => bucket.usedPercent >= 0 && bucket.usedPercent <= 100),
    'Bucket preview percentages must be bounded'
  );
  assert.ok(
    typeof bundle.emptyStates.headsUp === 'string' &&
      typeof bundle.emptyStates.bucketPreview === 'string' &&
      typeof bundle.emptyStates.upcoming === 'string' &&
      typeof bundle.emptyStates.recent === 'string',
    'Empty states must be defined for all panels'
  );

  const textValues: string[] = [];
  collectStrings(bundle, textValues);
  const lowerText = textValues.join(' ').toLowerCase();
  const forbidden = [
    'approve',
    'decline',
    'authorize',
    'terminal',
    'fronting',
    'best card',
    'tap to pay',
    'proxy',
    'route',
    'process',
    'settle',
    'use this card',
    'payment rail',
    'payment card',
    'proxy bin',
    'cherry terminal',
    'tap to pay with cherry',
  ];
  forbidden.forEach((word) => {
    assert.ok(!lowerText.includes(word), `Forbidden language detected: ${word}`);
  });

  process.stdout.write('home-ui-contract: ok\n');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
