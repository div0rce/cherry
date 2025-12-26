import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { AutopilotMonthImpactBar } from '../components/autopilot/AutopilotMonthImpactBar.js';

async function run(): Promise<void> {
  const html = renderToStaticMarkup(
    <AutopilotMonthImpactBar
      segments={[
        { label: 'Buffer', percentage: 60, color: 'bg-[#FECACA]' },
        { label: 'Discretionary', percentage: 25, color: 'bg-[#BBF7D0]' },
        { label: 'Other', percentage: 15, color: 'bg-[#E2E8F0]' },
      ]}
    />
  );

  const lower = html.toLowerCase();
  assert.ok(lower.includes('buffer'), 'Provided segment labels should render verbatim');
  assert.ok(lower.includes('discretionary'), 'Provided segment labels should render verbatim');
  assert.ok(lower.includes('other'), 'Provided segment labels should render verbatim');
  assert.ok(lower.includes('60%'), 'Provided segment percentages should render');
  assert.ok(
    !lower.includes('essentials · 62% remaining'.toLowerCase()),
    'Static legends must not appear; engine payload renders verbatim'
  );

  process.stdout.write('autopilot-month-impact: ok\n');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
