import type { JSX } from 'react';
import { fetchFromApi, requireUserContext } from '../_lib/api.js';
import { HomeScreen, type HomeSetup } from './_components/HomeScreen.js';
export const dynamic = 'force-dynamic';

export default async function AppHome(): Promise<JSX.Element> {
  await requireUserContext('/app');
  const prereqs = await fetchFromApi<{ missing: 'cards' | 'rules' | 'buckets' | null }>(
    '/api/autopilot/prereqs'
  );
  const setup: HomeSetup = !prereqs.ok ? 'unknown' : prereqs.data.missing === null ? 'ready' : 'needs-setup';
  return <HomeScreen setup={setup} />;
}
