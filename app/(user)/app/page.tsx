import type { JSX } from 'react';
import AutopilotClient from './AutopilotClient';
import { Shell } from '@/components/layout/Shell';
import { Panel } from '@/components/layout/Panel';
import { PageHeader } from '@/components/ui/page-header';

export default function AutopilotAppHome(): JSX.Element {
  return (
    <Shell
      contentClassName="max-w-4xl"
      header={
        <PageHeader
          title="Autopilot"
          description="Tell Cherry what you’re about to buy. We’ll pick the card, you confirm, and we’ll show the impact."
        />
      }
    >
      <Panel>
        <AutopilotClient />
      </Panel>
    </Shell>
  );
}
