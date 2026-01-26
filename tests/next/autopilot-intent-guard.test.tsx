import * as assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AutopilotDecisionPanel } from '../../components/autopilot/AutopilotDecisionPanel.js';
import { AutopilotPurchaseForm } from '../../components/autopilot/AutopilotPurchaseForm.client.js';
import type { Category, Timing } from '../../components/autopilot/AutopilotShell.js';
import { getAutopilotUiSpec } from '../../lib/autopilot/uiSpec.js';

void React;

async function run(): Promise<void> {
  const uiSpec = getAutopilotUiSpec();
  const html = renderToStaticMarkup(
    <AutopilotDecisionPanel
      uiSpec={uiSpec}
      hasPurchase={false}
      purchaseSummary={null}
      simulationResult={null}
      isSimulating={false}
      simulationError={null}
    />
  );

  assert.ok(html.includes(uiSpec.panel.idleBody), 'Idle copy should render before intent is declared');
  assert.ok(!html.toLowerCase().includes('autopilot result'), 'Decision surface must stay hidden until intent');

  const category = uiSpec.form.categoryOptions[0]?.value as Category;
  const timing = uiSpec.form.timingOptions[0]?.value as Timing;
  const formHtml = renderToStaticMarkup(
    <AutopilotPurchaseForm
      uiSpec={uiSpec}
      amount={null}
      merchant=""
      category={category}
      timing={timing}
      canSimulate={false}
      isSimulating={false}
      onAmountChange={() => {}}
      onMerchantChange={() => {}}
      onCategoryChange={() => {}}
      onTimingChange={() => {}}
      onSimulate={() => {}}
    />
  );

  assert.ok(
    formHtml.includes('disabled'),
    'Run Autopilot stays disabled until required intent (amount + merchant) is declared'
  );

  process.stdout.write('autopilot-intent-guard: ok\n');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
