import type { JSX } from 'react';
import AutopilotClient from './AutopilotClient';
import { PageHeader } from '@/components/ui/page-header';

export default function AutopilotAppHome(): JSX.Element {
  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-8">
      <PageHeader
        title="Autopilot"
        description="Tell Cherry what you’re about to buy. We’ll pick the card, you confirm, and we’ll show the impact."
      />

      <AutopilotClient />
    </div>
  );
}
