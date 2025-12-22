import type { JSX } from 'react';
import { resolveUserContext } from '@/lib/user-context';
import { getHomeUiBundle } from '@/lib/home/ui-bundle';
import { HomeScreen } from './_components/HomeScreen';

export default async function AppHome(): Promise<JSX.Element> {
  const { userId } = await resolveUserContext({ requireAuth: true, allowLabDemo: true });
  const homeBundle = await getHomeUiBundle(userId);
  return <HomeScreen bundle={homeBundle} />;
}
