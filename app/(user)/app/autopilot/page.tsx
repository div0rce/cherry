import type { JSX } from 'react';
import { redirect } from 'next/navigation';
import { fetchFromApi, requireUserContext } from '../../_lib/api.js';
import { getAutopilotUiSpec } from '../../../../lib/autopilot/uiSpec.js';
import type { AutopilotPrereqs } from '../../../../lib/autopilot/prereq-types.js';
import { AutopilotEntry } from '../_components/AutopilotEntry.js';

export const dynamic = 'force-dynamic';

export default async function AutopilotPage(): Promise<JSX.Element> {
  await requireUserContext();
  const prereqResponse = await fetchFromApi('/api/autopilot/prereqs');
  if (!prereqResponse.ok) {
    throw new Error('Failed to load Autopilot prerequisites');
  }
  const prereqPayload = (await prereqResponse.json()) as {
    prereqs: AutopilotPrereqs;
    missing: 'cards' | 'rules' | 'buckets' | null;
  };
  const missing = prereqPayload.missing;

  if (missing !== null) {
    redirect(`/app/onboarding?missing=${missing}`);
  }

  return <AutopilotEntry uiSpec={getAutopilotUiSpec()} />;
}
