import type { JSX } from 'react';
import { requireUserContext } from '../_lib/api.js';
import { getHomeUiBundle } from '../../../lib/home/ui-bundle.js';
import { HomeScreen } from './_components/HomeScreen.js';
export const dynamic = 'force-dynamic';


export default async function AppHome(): Promise<JSX.Element> {
  const { userId } = await requireUserContext();
  const homeBundle = await getHomeUiBundle(userId);
  return <HomeScreen bundle={homeBundle} />;
}
