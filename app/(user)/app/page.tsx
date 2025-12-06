import type { JSX } from 'react';
import AutopilotClient from './AutopilotClient';
import { PageHeader } from '@/components/ui/page-header';
import { getCurrentUserIdOrRedirect } from '@/lib/auth';
import { ROUTES } from '@/lib/routes';

export default async function AutopilotAppHome(): Promise<JSX.Element> {
  const userId = await getCurrentUserIdOrRedirect(ROUTES.user.app);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 space-y-6">
      <PageHeader
        title="Autopilot"
        description="Tell Cherry what you’re about to buy. We’ll pick the card, you confirm, and we’ll show the impact."
      />
      <AutopilotClient userId={userId} />
    </div>
  );
}
