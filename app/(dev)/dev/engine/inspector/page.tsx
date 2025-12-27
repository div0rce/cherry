import type { JSX } from 'react';
import { PageHeader } from '../../../../../components/ui/page-header';
import { Panel } from '../../../../../components/ui/panel';
import InspectorClient from './client';

export default function EngineInspectorPage(): JSX.Element {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        label="Engine"
        badge="Dev / Engine Inspector"
        title="Engine decision inspector"
        description="Run the engine against an ad-hoc payload and see candidate actions, scores, and guardrails."
      />

      <Panel
        tone="muted"
        title="Inspect a decision"
        description="Provide merchant and amount to view the ranked candidates and any guardrails that trigger."
      >
        <InspectorClient />
      </Panel>
    </div>
  );
}
