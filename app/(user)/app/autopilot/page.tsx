import type { JSX } from 'react';
import { redirect } from 'next/navigation';
import { fetchFromApi, requireUserContext } from '../../_lib/api.js';
import { getAutopilotUiSpec } from '../../../../lib/autopilot/uiSpec.js';
import type { AutopilotPrereqs } from '../../../../lib/autopilot/prereq-types.js';
import { AutopilotEntry } from '../_components/AutopilotEntry.js';

export const dynamic = 'force-dynamic';

export default async function AutopilotPage(): Promise<JSX.Element> {
  await requireUserContext();
  const prereqResponse = await fetchFromApi<{
    prereqs: AutopilotPrereqs;
    missing: 'cards' | 'rules' | 'buckets' | null;
  }>('/api/autopilot/prereqs');
  if (prereqResponse.ok !== true) {
    throw new Error(prereqResponse.message);
  }
  const prereqPayload = prereqResponse.data;
  const missing = prereqPayload.missing;

  if (missing !== null) {
    redirect(`/app/onboarding?missing=${missing}`);
  }

  return <AutopilotEntry uiSpec={getAutopilotUiSpec()} />;
}
